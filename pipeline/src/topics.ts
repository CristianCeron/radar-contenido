import { z } from "zod";
import type { NormalizedItem } from "./schema.js";
import type { LLM } from "./llm/types.js";
import { mapPool } from "./pool.js";

export interface TopicGroup {
  id: string;
  label: string;
  items: NormalizedItem[];
}

const STOPWORDS = new Set([
  "de", "del", "la", "las", "el", "los", "en", "y", "a", "con", "para", "por", "un", "una",
  "the", "of", "for", "and", "in", "on", "with", "to",
]);

// Traducciones mínimas para que la misma idea en inglés y en español dé la misma clave.
const SYNONYMS: Record<string, string> = {
  ai: "ia",
  agent: "agente", agents: "agente", agentes: "agente",
  model: "modelo", models: "modelo", modelos: "modelo",
  videos: "video",
  language: "lenguaje", languages: "lenguaje", lenguajes: "lenguaje",
  large: "grande", grandes: "grande",
  coding: "programacion", code: "programacion", codigo: "programacion",
  regulation: "regulacion", regulations: "regulacion", regulaciones: "regulacion",
  open: "abierto", abiertos: "abierto",
  source: "codigo-abierto",
  chips: "chip",
  robots: "robot", robotics: "robotica",
  security: "seguridad",
  generative: "generativa", generativo: "generativa",
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Clave canónica de una etiqueta: sin tildes, sin palabras vacías, con sinónimos y sin plurales, en orden.
export function labelKey(label: string): string {
  const tokens = slug(label)
    .split("-")
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
  return [...new Set(tokens)].sort().join(" ");
}

const LabelSchema = z.object({
  items: z.array(z.object({ id: z.string(), topic: z.string().nullable() })),
});

const MergeSchema = z.object({
  merges: z.array(z.object({ canonical: z.string(), aliases: z.array(z.string()) })),
});

const LABEL_SYSTEM = `Asignas un tema a cada pieza de contenido sobre inteligencia artificial.
- El tema es una etiqueta corta en español (2 a 4 palabras), lo bastante amplia para agrupar varias piezas: "Agentes de IA", "Modelos de video", "Regulación de IA".
- Reutiliza una etiqueta existente cuando la pieza encaje en ella.
- Si la pieza no trata de inteligencia artificial, devuelve topic: null.
- Usa exactamente el id recibido.`;

const MERGE_SYSTEM = `Recibes etiquetas de temas de IA. Agrupa solo las que son sinónimos o el mismo tema dicho distinto
(por ejemplo "Agentes de IA" y "Agentes autónomos"). No fusiones temas relacionados pero distintos.
Para cada grupo devuelve la etiqueta canónica en español y sus alias. Si no hay sinónimos, devuelve merges vacío.`;

export interface AssignOptions {
  concurrency?: number;
  batchSize?: number;
}

function mostCommonLabel(labels: string[]): string {
  const counts = new Map<string, { n: number; first: string }>();
  for (const l of labels) {
    const k = l.trim().toLowerCase();
    const entry = counts.get(k) ?? { n: 0, first: l.trim() };
    entry.n++;
    counts.set(k, entry);
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0].first;
  return best.charAt(0).toUpperCase() + best.slice(1);
}

// Etiqueta los ítems por lotes con un modelo barato y agrupa por clave canónica.
export async function assignTopics(items: NormalizedItem[], llm: LLM, opts: AssignOptions = {}): Promise<TopicGroup[]> {
  const batchSize = opts.batchSize ?? 80;
  const byId = new Map(items.map((i) => [i.id, i]));
  const labelOf = new Map<string, string>();
  const known = new Set<string>();

  const batches: NormalizedItem[][] = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));

  async function label(batch: NormalizedItem[]) {
    const listing = batch.map((it) => JSON.stringify({ id: it.id, titulo: it.title })).join("\n");
    const shown = [...known].slice(-200);
    const existing = shown.length ? `Etiquetas ya usadas: ${shown.join(" | ")}\n\n` : "";
    const result = await llm.json({
      label: "temas-etiquetado",
      system: LABEL_SYSTEM,
      prompt: `${existing}Piezas:\n${listing}`,
      schema: LabelSchema,
      maxTokens: 400 + batch.length * 40,
    });
    for (const { id, topic } of result.items) {
      if (!topic || !byId.has(id)) continue;
      labelOf.set(id, topic.trim());
      known.add(topic.trim());
    }
  }

  // El primer lote va solo para sembrar etiquetas; el resto puede ir en paralelo reutilizándolas.
  if (batches.length) await label(batches[0]);
  await mapPool(batches.slice(1), opts.concurrency ?? 1, label);

  // Fusión de sinónimos que la clave determinista no alcanza a unir.
  const canonicalByKey = new Map<string, { key: string; label: string }>();
  const uniqueKeys = new Set([...known].map(labelKey));
  if (uniqueKeys.size > 1) {
    const { merges } = await llm.json({
      label: "temas-fusion",
      system: MERGE_SYSTEM,
      prompt: [...known].join("\n"),
      schema: MergeSchema,
      maxTokens: 8000,
    });
    for (const m of merges) {
      const target = { key: labelKey(m.canonical), label: m.canonical };
      for (const alias of [m.canonical, ...m.aliases]) canonicalByKey.set(labelKey(alias), target);
    }
  }

  const groups = new Map<string, { labels: string[]; items: NormalizedItem[]; canonical?: string }>();
  for (const [id, label] of labelOf) {
    const merged = canonicalByKey.get(labelKey(label));
    const key = merged?.key ?? labelKey(label);
    if (!key) continue;
    const g = groups.get(key) ?? { labels: [], items: [], canonical: merged?.label };
    g.labels.push(label);
    g.items.push(byId.get(id)!);
    groups.set(key, g);
  }

  return [...groups.values()].map((g) => {
    const label = g.canonical ?? mostCommonLabel(g.labels);
    return { id: slug(label), label, items: g.items };
  });
}
