import { z } from "zod";
import type { NormalizedItem, Source } from "./schema.js";
import type { LLM } from "./llm/types.js";
import { mapPool } from "./pool.js";
import { CostLimitExceeded } from "./cost.js";
import { errorMessage } from "./sources/types.js";

export interface TopicGroup {
  id: string;
  label: string;
  items: NormalizedItem[];
  pilar?: string;
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

// Etiquetas que el modelo a veces devuelve aunque se le pida evitarlas: agrupan cualquier cosa
// y no le dicen nada a un equipo de contenido, así que no entran al top.
const GENERIC_LABELS = [
  "Uso de IA",
  "Fundamentos de IA",
  "Profesionales de IA",
  "Experiencias con IA",
  "Noticias de IA",
  "IA en general",
  "Inteligencia artificial",
  "Herramientas de IA",
  "Aplicaciones de IA",
  "Tendencias de IA",
  "Futuro de la IA",
];
const GENERIC_KEYS = new Set(GENERIC_LABELS.map(labelKey));

export function isGenericLabel(label: string): boolean {
  return GENERIC_KEYS.has(labelKey(label));
}

// Respuestas que significan "ningún tema" y nunca deben convertirse en un tema.
const NOT_A_TOPIC = /^(null|none|n\/a|ninguno|ninguna|otro|otros|otra|sin tema|no aplica)$/i;

const TaxonomySchema = z.object({ topics: z.array(z.string()) });
const PillarTaxonomySchema = z.object({ topics: z.array(z.object({ label: z.string(), pilar: z.string() })) });

const taxonomySystem = (tema: string, pilares?: string[]) => `Recibes una muestra de títulos de piezas recientes sobre ${tema} (foros, expertos, investigación, YouTube y prensa de negocios).
${
  pilares?.length
    ? `Organiza los temas por pilar. Pilares: ${pilares.join("; ")}.
Propón entre 3 y 5 temas por pilar, cada uno con el nombre exacto de su pilar.`
    : "Propón entre 25 y 40 temas que agrupen esas piezas."
}
Piensa en un equipo de contenido que le habla a founders y ejecutivos de Latinoamérica.
- Cada tema es una etiqueta corta en español (2 a 4 palabras) que nombra algo concreto: una práctica, una tecnología, un tipo de producto o un hecho del sector. Ejemplos: "Sistemas de ventas B2B", "Contratación de líderes", "Rondas de inversión en Latinoamérica", "Agentes de IA", "Regulación de IA".
- Evita categorías genéricas que sirven para cualquier pieza, como "Experiencias con IA", "Fundamentos de IA", "Noticias de IA", "Profesionales de IA" o "IA en general".
- No repitas el mismo tema con otras palabras.`;

const labelSystem = (tema: string) => `Asignas a cada pieza de contenido uno de los temas de la lista numerada recibida.
- En topic devuelve el número del tema que mejor la describa.
- Si la pieza no trata de ${tema} o no encaja en ningún tema, devuelve topic: 0.
- Usa exactamente el id recibido y clasifica todas las piezas.`;

export interface AssignOptions {
  concurrency?: number;
  batchSize?: number;
  sampleSize?: number;
  // Tema que rastrea el radar; por defecto, inteligencia artificial.
  tema?: string;
  // Pilares de la temática: los temas se proponen dentro de ellos.
  pilares?: string[];
  log?: (msg: string) => void;
}

function engagement(item: NormalizedItem): number {
  const m = item.metrics ?? {};
  return (m.views ?? 0) / 1000 + (m.points ?? 0) + (m.comments ?? 0) * 2;
}

// Muestra variada para proponer los temas: la misma cuota por fuente (las de más interacción primero)
// y el resto se completa por interacción. Así arXiv o la prensa no quedan tapados por Hacker News.
function sampleForTaxonomy(items: NormalizedItem[], size: number): NormalizedItem[] {
  const bySource = new Map<Source, NormalizedItem[]>();
  for (const it of items) bySource.set(it.source, [...(bySource.get(it.source) ?? []), it]);
  const quota = Math.ceil(size / Math.max(1, bySource.size));
  const picked = new Set<NormalizedItem>();
  for (const list of bySource.values()) {
    for (const it of [...list].sort((a, b) => engagement(b) - engagement(a)).slice(0, quota)) picked.add(it);
  }
  for (const it of [...items].sort((a, b) => engagement(b) - engagement(a))) {
    if (picked.size >= size) break;
    picked.add(it);
  }
  return [...picked].slice(0, size);
}

// Entre dos formas del mismo tema se prefiere la que suena a español ("Agentes de IA" sobre "AI agents").
function spanishScore(label: string): number {
  return (/\bIA\b/.test(label) ? 2 : 0) + (/\b(de|del|para|con)\b|ción|[áéíóúñ]/i.test(label) ? 1 : 0);
}

interface Proposed {
  label: string;
  pilar?: string;
}

// Limpia la lista propuesta: sin vacíos, sin "ninguno", sin genéricos y sin repetidos por clave.
// Un pilar que no está en la lista del tema se descarta (el tema queda sin pilar).
function cleanTaxonomy(topics: Proposed[], pilares?: string[]): Proposed[] {
  const byKey = new Map<string, Proposed>();
  for (const raw of topics) {
    const label = raw.label.trim().replace(/\s+/g, " ");
    const key = labelKey(label);
    if (!label || !key || NOT_A_TOPIC.test(label) || isGenericLabel(label)) continue;
    const pilar = raw.pilar && pilares?.includes(raw.pilar.trim()) ? raw.pilar.trim() : undefined;
    const current = byKey.get(key);
    if (!current || spanishScore(label) > spanishScore(current.label)) {
      byKey.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), pilar: pilar ?? current?.pilar });
    }
  }
  return [...byKey.values()];
}

// Dos pasos: el modelo propone una lista cerrada de temas con una muestra de títulos, y luego cada
// pieza se etiqueta eligiendo de esa lista. No hay etiquetas libres que fusionar después.
export async function assignTopics(items: NormalizedItem[], llm: LLM, opts: AssignOptions = {}): Promise<TopicGroup[]> {
  const batchSize = opts.batchSize ?? 80;
  const log = opts.log ?? console.warn;
  const tema = opts.tema ?? "inteligencia artificial";
  if (items.length === 0) return [];

  const sample = sampleForTaxonomy(items, opts.sampleSize ?? 300);
  const request = {
    label: "temas-taxonomia",
    system: taxonomySystem(tema, opts.pilares),
    prompt: `Títulos:\n${sample.map((it) => `- ${it.title}`).join("\n")}`,
    maxTokens: 6000,
  };
  const proposed: Proposed[] = opts.pilares?.length
    ? (await llm.json({ ...request, schema: PillarTaxonomySchema })).topics
    : (await llm.json({ ...request, schema: TaxonomySchema })).topics.map((label) => ({ label }));
  const entries = cleanTaxonomy(proposed, opts.pilares);
  const taxonomy = entries.map((e) => e.label);
  const pilarOf = new Map(entries.map((e) => [e.label, e.pilar]));
  if (taxonomy.length === 0) throw new Error("El modelo no propuso temas utilizables");

  // El modelo responde el número del tema: es corto y robusto. Un número fuera de la lista se descarta.
  const LabelSchema = z.object({ items: z.array(z.object({ id: z.string(), topic: z.number().int() })) });
  const list = taxonomy.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const byId = new Map(items.map((i) => [i.id, i]));
  const groups = new Map<string, NormalizedItem[]>();

  const batches: NormalizedItem[][] = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));

  await mapPool(batches, opts.concurrency ?? 1, async (batch) => {
    const listing = batch.map((it) => JSON.stringify({ id: it.id, titulo: it.title })).join("\n");
    try {
      const result = await llm.json({
        label: "temas-etiquetado",
        system: labelSystem(tema),
        prompt: `Temas posibles:\n${list}\n\nPiezas:\n${listing}`,
        schema: LabelSchema,
        maxTokens: 500 + batch.length * 40,
      });
      for (const { id, topic: n } of result.items) {
        const item = byId.get(id);
        const topic = taxonomy[n - 1];
        if (!topic || !item) continue;
        groups.set(topic, [...(groups.get(topic) ?? []), item]);
      }
    } catch (err) {
      // Un lote sin etiquetar no detiene la corrida: esos ítems quedan fuera de los temas.
      if (err instanceof CostLimitExceeded) throw err;
      log(`Etiquetado falló en un lote de ${batch.length} ítems: ${errorMessage(err)}`);
    }
  });

  return [...groups].map(([label, groupItems]) => ({ id: slug(label), label, items: groupItems, pilar: pilarOf.get(label) }));
}
