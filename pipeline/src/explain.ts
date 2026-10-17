import { z } from "zod";
import type { Classification, Evidence, NormalizedItem, Source, Stage, Topic } from "./schema.js";
import type { LLM } from "./llm/types.js";

type Piece = Topic["topPieces"][number];
type Channel = Topic["channels"][number];

const DEFAULT_FORMAT: Record<Source, string> = {
  youtube: "video",
  hackernews: "hilo de discusión",
  arxiv: "artículo académico",
  prensa: "nota de prensa",
};

const OUTLET_URL: Record<string, string> = {
  "Hacker News": "https://news.ycombinator.com",
  arXiv: "https://arxiv.org",
};

function engagement(item: NormalizedItem): number {
  const m = item.metrics ?? {};
  return (m.views ?? 0) / 1000 + (m.points ?? 0) + (m.comments ?? 0) * 2;
}

// Piezas principales: primero la de más interacción de cada fuente, luego el resto por interacción.
export function rankPieces(items: NormalizedItem[], limit: number): NormalizedItem[] {
  const sorted = [...items].sort((a, b) => engagement(b) - engagement(a));
  const firsts: NormalizedItem[] = [];
  const seen = new Set<Source>();
  for (const it of sorted) {
    if (!seen.has(it.source)) {
      seen.add(it.source);
      firsts.push(it);
    }
  }
  const rest = sorted.filter((it) => !firsts.includes(it));
  return [...firsts, ...rest].slice(0, limit);
}

// Canales y medios públicos que hablan del tema. Nunca perfiles personales.
export function buildChannels(items: NormalizedItem[], limit = 10): Channel[] {
  const counts = new Map<string, Channel>();
  for (const item of items) {
    const mentions = item.mentions?.length ? item.mentions : [{ source: item.source, outlet: item.outlet, url: item.url }];
    for (const m of mentions) {
      const key = `${m.source}|${m.outlet}`;
      const ch = counts.get(key) ?? { name: m.outlet, source: m.source, url: OUTLET_URL[m.outlet], count: 0 };
      ch.count++;
      counts.set(key, ch);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

const ExplainSchema = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()),
  pieces: z.array(z.object({ id: z.string(), format: z.string(), analysis: z.string() })),
});

const SYSTEM = `Eres analista de tendencias de IA para equipos de contenido que le hablan a ejecutivos de Latinoamérica.
Explica por qué un tema está creciendo usando SOLO la evidencia recibida. No inventes datos, cifras ni fuentes.
- text: 2 o 3 oraciones en español neutro, directas y concretas. Sin guion largo, sin frases de relleno.
- evidenceIds: las refs (e1, e2...) de la evidencia que respalda la explicación. Al menos una.
- pieces: para las piezas principales (máximo 5), el formato (por ejemplo "video tutorial largo", "hilo de discusión", "nota de prensa con cifras") y un análisis de una oración de cómo engancha a su audiencia.`;

export interface ExplainInput {
  label: string;
  stage: Stage;
  velocity: number | null;
  items: NormalizedItem[];
}

export interface ExplainOptions {
  llm: LLM;
  classifications: Map<string, Classification>;
  maxEvidence?: number;
}

export interface ExplainResult {
  explanation: { text: string; evidence: Evidence[] };
  topPieces: Piece[];
}

function clean(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").trim();
}

// Redacta el porqué de un tema restringido a la evidencia recolectada.
// Devuelve null si el modelo no enlaza ninguna evidencia válida: esa explicación no se muestra.
export async function explainTopic(topic: ExplainInput, opts: ExplainOptions): Promise<ExplainResult | null> {
  const evidence = rankPieces(topic.items, opts.maxEvidence ?? 15);
  const byRef = new Map(evidence.map((it, i) => [`e${i + 1}`, it]));
  const lines = [...byRef].map(([ref, it]) =>
    JSON.stringify({
      ref,
      titulo: it.title,
      fuente: it.outlet,
      tipo: it.source,
      url: it.url,
      gancho: opts.classifications.get(it.id)?.hook,
      interaccion: it.metrics,
    }),
  );

  const result = await opts.llm.json({
    label: "explicacion",
    system: SYSTEM,
    prompt: `Tema: ${topic.label}\nEtapa: ${topic.stage}\nVelocidad semanal: ${topic.velocity ?? "sin dato"}%\n\nEvidencia:\n${lines.join("\n")}`,
    schema: ExplainSchema,
    maxTokens: 2000,
  });

  const linked = [...new Set(result.evidenceIds)].map((ref) => byRef.get(ref)).filter((it): it is NormalizedItem => !!it);
  if (linked.length === 0 || !result.text.trim()) return null;

  const analysisById = new Map<string, { format: string; analysis: string }>();
  for (const p of result.pieces) {
    const it = byRef.get(p.id);
    if (it) analysisById.set(it.id, { format: clean(p.format), analysis: clean(p.analysis) });
  }

  const topPieces: Piece[] = evidence.slice(0, 5).map((it) => {
    const a = analysisById.get(it.id);
    return {
      title: it.title,
      url: it.url,
      source: it.source,
      outlet: it.outlet,
      hook: opts.classifications.get(it.id)?.hook ?? "otro",
      format: a?.format ?? DEFAULT_FORMAT[it.source],
      analysis: a?.analysis,
    };
  });

  return {
    explanation: { text: clean(result.text), evidence: linked.map((it) => ({ title: it.title, url: it.url })) },
    topPieces,
  };
}
