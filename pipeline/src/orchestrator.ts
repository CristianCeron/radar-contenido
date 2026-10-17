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
import { assignStage, layerCounts, presentLayers } from "./stage.js";
import { selectTop, topicRelevance } from "./top.js";
import { assignTopics } from "./topics.js";
import type { SourceResult } from "./sources/types.js";
import { errorMessage, windowStart } from "./sources/types.js";
import { buildSeries, recentMentions, velocity } from "./velocity.js";

const SOURCES: Source[] = ["hackernews", "arxiv", "youtube", "prensa"];

export interface RadarDeps {
  now: Date;
  sources: Record<Source, () => Promise<SourceResult>>;
  cacheDir: string;
  outputPath: string;
  makeLLMs: (sink: CostSink) => { fast: LLM; writer: LLM };
  makeClassifiers: (fast: LLM, sink: CostSink) => { primary: Classifier; fallback: Classifier };
  profiles: Profile[];
  limitUsd: number;
  concurrency?: number;
  minRecentMentions?: number;
  log?: (msg: string) => void;
}

interface Collected {
  items: NormalizedItem[];
  statuses: SourceStatus[];
}

// Lee cada fuente; si falla, recurre al último resultado guardado y lo indica con su fecha.
async function collect(deps: RadarDeps, log: (m: string) => void): Promise<Collected> {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      let res: SourceResult;
      try {
        res = await deps.sources[source]();
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

  const groups = await assignTopics(items, fast, { concurrency: pool, log });
  log(`Temas: ${groups.length}`);

  const candidates = groups.map((g) => {
    const series = buildSeries(g.items, deps.now);
    const counts = layerCounts(g.items);
    const vel = velocity(series);
    return {
      group: g,
      series,
      velocity: vel,
      layers: presentLayers(counts),
      stage: assignStage({ layers: counts, velocity: vel }),
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
        { llm: writer, classifications },
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

  return {
    generatedAt: deps.now.toISOString(),
    windowDays: 30,
    sources: statuses,
    profiles: deps.profiles.map((p) => ({ id: p.id, nombre: p.nombre })),
    topics,
  };
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
