import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { generateBrief, type Profile } from "./brief.js";
import { readCachedSource, writeCachedSource } from "./cache.js";
import { classifyWithFallback, type Classifier } from "./classify/index.js";
import { CostLimitExceeded, runWithCostLimit, type GuardedResult } from "./cost.js";
import { mergeSources } from "./dedupe.js";
import { buildChannels, explainTopic } from "./explain.js";
import type { CostSink, LLM } from "./llm/types.js";
import { mapPool } from "./pool.js";
import { RadarSchema, type Brief, type NormalizedItem, type Radar, type Source, type SourceStatus, type Topic } from "./schema.js";
import { assignStage, layerCounts, presentLayers, PRODUCTION_STAGE_CONFIG } from "./stage.js";
import { selectTop, topicRelevance } from "./top.js";
import { assignTopics, isGenericLabel } from "./topics.js";
import type { SourceResult } from "./sources/types.js";
import { errorMessage, windowStart } from "./sources/types.js";
import { buildSeries, recentMentions, velocity } from "./velocity.js";

const SOURCES: Source[] = ["hackernews", "arxiv", "expertos", "youtube", "prensa", "equipo"];

export interface RadarDeps {
  now: Date;
  // "equipo" (sensor humano) es opcional: si no hay hoja configurada, no se incluye.
  sources: Partial<Record<Source, () => Promise<SourceResult>>>;
  cacheDir: string;
  outputPath: string;
  makeLLMs: (sink: CostSink) => { fast: LLM; writer: LLM };
  makeClassifiers: (fast: LLM, sink: CostSink) => { primary: Classifier; fallback: Classifier };
  profiles: Profile[];
  limitUsd: number;
  concurrency?: number;
  minRecentMentions?: number;
  // Nombre del tema que rastrea el radar (config/tema.json).
  tema?: string;
  log?: (msg: string) => void;
}

interface Collected {
  items: NormalizedItem[];
  statuses: SourceStatus[];
}

// Lee cada fuente; si falla, recurre al último resultado guardado y lo indica con su fecha.
async function collect(deps: RadarDeps, log: (m: string) => void): Promise<Collected> {
  const results = await Promise.all(
    SOURCES.filter((s) => deps.sources[s]).map(async (source) => {
      let res: SourceResult;
      try {
        res = await deps.sources[source]!();
      } catch (err) {
        res = { status: "error", items: [], error: errorMessage(err) };
      }
      if (res.status === "ok") {
        writeCachedSource(deps.cacheDir, source, deps.now, res.items);
        log(`${source}: ${res.items.length} ítems${res.error ? ` (avisos: ${res.error})` : ""}`);
        return { res, status: { source, status: "ok", fetchedAt: deps.now.toISOString(), items: res.items.length } as SourceStatus };
      }
      const cached = readCachedSource(deps.cacheDir, source);
      log(`${source}: ${res.status} (${res.error ?? ""})${cached ? `, se usa lo guardado el ${cached.fetchedAt}` : ", sin resultado guardado"}`);
      if (cached) {
        return {
          res: { status: "ok", items: cached.items } as SourceResult,
          status: { source, status: "ultimo_guardado", fetchedAt: cached.fetchedAt, items: cached.items.length } as SourceStatus,
        };
      }
      return { res, status: { source, status: res.status, fetchedAt: deps.now.toISOString(), items: 0 } as SourceStatus };
    }),
  );

  const since = windowStart(deps.now).getTime();
  const items = mergeSources(results.map((r) => r.res)).filter((i) => new Date(i.publishedAt).getTime() >= since);
  return { items, statuses: results.map((r) => r.status) };
}

async function buildRadar(deps: RadarDeps, sink: CostSink): Promise<Omit<Radar, "cost">> {
  const log = deps.log ?? console.log;
  const pool = deps.concurrency ?? 2;
  const { fast, writer } = deps.makeLLMs(sink);
  const { primary, fallback } = deps.makeClassifiers(fast, sink);

  const { items, statuses } = await collect(deps, log);
  log(`Ítems únicos en la ventana: ${items.length}`);

  const classifications = await classifyWithFallback(items, { primary, fallback, log, concurrency: pool });
  log(`Clasificados: ${classifications.size}`);

  const groups = await assignTopics(items, fast, { concurrency: pool, log, tema: deps.tema });
  log(`Temas: ${groups.length}`);

  const specific = groups.filter((g) => !isGenericLabel(g.label));
  if (specific.length < groups.length) log(`Temas genéricos descartados: ${groups.length - specific.length}`);
  const candidates = specific.map((g) => {
    const series = buildSeries(g.items, deps.now);
    const counts = layerCounts(g.items);
    const vel = velocity(series);
    return {
      group: g,
      series,
      velocity: vel,
      layers: presentLayers(counts, PRODUCTION_STAGE_CONFIG.minLayerMentions),
      stage: assignStage({ layers: counts, velocity: vel }, PRODUCTION_STAGE_CONFIG),
      executiveRelevance: Math.round(topicRelevance(g.items.map((i) => i.id), classifications) * 100) / 100,
      recentMentions: recentMentions(series, 14),
    };
  });

  // Se piden más candidatos que 10: los que no logren una explicación con evidencia se descartan.
  const ranked = selectTop(candidates, { limit: 15, minRecentMentions: deps.minRecentMentions ?? 8 });
  const explained = await mapPool(ranked, pool, async (c) => {
    try {
      const res = await explainTopic(
        { label: c.group.label, stage: c.stage, velocity: c.velocity, items: c.group.items },
        { llm: writer, classifications, tema: deps.tema },
      );
      if (!res) log(`Sin evidencia enlazada, se descarta: ${c.group.label}`);
      return res ? { ...c, ...res } : null;
    } catch (err) {
      if (err instanceof CostLimitExceeded) throw err;
      log(`Error explicando ${c.group.label}: ${errorMessage(err)}`);
      return null;
    }
  });
  const top = explained.filter((c): c is NonNullable<typeof c> => c !== null).slice(0, 10);

  const jobs = top.flatMap((t) => deps.profiles.map((p) => ({ t, p })));
  const briefs = await mapPool(jobs, pool, async ({ t, p }) => {
    try {
      const brief = await generateBrief(
        { label: t.group.label, stage: t.stage, velocity: t.velocity, explanation: t.explanation, topPieces: t.topPieces },
        p,
        { llm: writer, now: deps.now },
      );
      return { topicId: t.group.id, brief };
    } catch (err) {
      if (err instanceof CostLimitExceeded) throw err;
      log(`Error en brief ${p.id} / ${t.group.label}: ${errorMessage(err)}`);
      return null;
    }
  });

  const topics: Topic[] = top.map((t) => {
    const own: Record<string, Brief> = {};
    for (const b of briefs) if (b && b.topicId === t.group.id) own[b.brief.profileId] = b.brief;
    return {
      id: t.group.id,
      label: t.group.label,
      stage: t.stage,
      velocity: t.velocity,
      executiveRelevance: t.executiveRelevance,
      score: t.score,
      layers: t.layers.length ? t.layers : ["origen"],
      series: t.series,
      channels: buildChannels(t.group.items),
      topPieces: t.topPieces,
      explanation: t.explanation,
      briefs: own,
    };
  });

  const published = stripPrivateLinks(topics, privateLinks(items));
  // Un radar vacío es una corrida fallida: se aborta para conservar el radar anterior.
  if (published.length === 0) throw new Error("La corrida terminó sin temas con evidencia; se conserva el radar anterior");

  return {
    generatedAt: deps.now.toISOString(),
    windowDays: 30,
    sources: statuses,
    profiles: deps.profiles.map((p) => ({ id: p.id, nombre: p.nombre })),
    topics: published,
  };
}

// Enlaces del sensor humano: pueden llevar el nombre de una persona y nunca se publican.
function privateLinks(items: NormalizedItem[]): Set<string> {
  const links = new Set<string>();
  for (const it of items) {
    if (it.source === "equipo") links.add(it.url);
    for (const m of it.mentions ?? []) if (m.source === "equipo") links.add(m.url);
  }
  return links;
}

// Última barrera antes de escribir: quita cualquier enlace privado que se haya colado en piezas,
// evidencia o canales. Un tema que se queda sin evidencia pública se descarta.
export function stripPrivateLinks(topics: Topic[], links: Set<string>): Topic[] {
  if (links.size === 0) return topics;
  return topics
    .map((t) => ({
      ...t,
      topPieces: t.topPieces.filter((p) => !links.has(p.url)),
      explanation: { ...t.explanation, evidence: t.explanation.evidence.filter((e) => !links.has(e.url)) },
      channels: t.channels.map((c) => (c.url && links.has(c.url) ? { ...c, url: undefined } : c)),
    }))
    .filter((t) => t.explanation.evidence.length > 0);
}

// Corrida completa: recolecta, clasifica, agrupa, rankea, explica, genera briefs y escribe radar.json.
// Si supera el tope de costo no escribe nada y queda el radar anterior.
export async function runRadar(deps: RadarDeps): Promise<GuardedResult> {
  return runWithCostLimit({
    limitUsd: deps.limitUsd,
    run: (sink) => buildRadar(deps, sink),
    write: (radar, cost) => {
      const full = RadarSchema.parse({ ...radar, cost });
      mkdirSync(dirname(deps.outputPath), { recursive: true });
      writeFileSync(deps.outputPath, JSON.stringify(full, null, 2) + "\n");
    },
  });
}
