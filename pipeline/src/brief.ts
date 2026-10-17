import { z } from "zod";
import type { Brief, Stage, Topic } from "./schema.js";
import type { LLM } from "./llm/types.js";

export const ProfileSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  quienEs: z.string().min(1),
  audiencia: z.string().min(1),
  voz: z.object({
    tono: z.string().min(1),
    rasgos: z.array(z.string()).min(1),
    evitar: z.array(z.string()),
  }),
  formatos: z.array(z.string()).min(1),
  productos: z
    .array(z.object({ nombre: z.string().min(1), descripcion: z.string().min(1), url: z.url() }))
    .min(1),
  fuentes: z.array(z.url()),
  porValidar: z.array(z.string()).default([]),
});
export type Profile = z.infer<typeof ProfileSchema>;

export interface BriefTopic {
  label: string;
  stage: Stage;
  velocity: number | null;
  explanation: Topic["explanation"];
  topPieces: Topic["topPieces"];
}

const STAGE_GUIDE: Record<Stage, string> = {
  emergente: "Pocos lo cubren todavía: el ángulo debe anticipar y explicar por qué importará.",
  creciendo: "Está ganando difusión: el ángulo debe ser práctico, cómo aplicarlo ya.",
  pico: "Todos hablan de él: el ángulo debe diferenciarse con un caso propio o una postura clara.",
  saturado: "Ya cansa: el ángulo debe ser contrario o de balance, qué quedó de verdad.",
};

const SYSTEM = `Eres estratega de contenido de una marca que educa a ejecutivos de Latinoamérica sobre IA.
Con un tema en tendencia y el perfil de la marca, propones UNA pieza de contenido:
- angle: el ángulo en una oración, escrito para esa audiencia.
- format: uno de los formatos de la marca, copiado tal cual.
- hook: la primera línea o los primeros 3 segundos, en la voz de la marca.
- opportunity.product: uno de los productos de la marca, copiado tal cual; opportunity.rationale: en una oración, cómo la pieza lleva a ese producto sin sonar a venta forzada.
No inventes cifras, porcentajes, estudios ni casos: usa solo los datos que aparecen en "Por qué crece" o en las piezas. Si no hay cifras, escribe sin cifras.
Escribe en español neutro con tuteo. Sin guion largo. Respeta lo que la marca evita.`;

function buildPrompt(topic: BriefTopic, profile: Profile): string {
  const pieces = topic.topPieces
    .slice(0, 3)
    .map((p) => `• ${p.title} (${p.outlet}, ${p.format}, gancho: ${p.hook})`)
    .join("\n");
  return [
    `Productos de la marca:`,
    ...profile.productos.map((p) => `- ${p.nombre}: ${p.descripcion}`),
    ``,
    `Marca: ${profile.nombre}`,
    `Quién es: ${profile.quienEs}`,
    `Audiencia: ${profile.audiencia}`,
    `Tono: ${profile.voz.tono}`,
    `Rasgos de voz:`,
    ...profile.voz.rasgos.map((r) => `• ${r}`),
    `Evita:`,
    ...profile.voz.evitar.map((r) => `• ${r}`),
    `Formatos de la marca: ${profile.formatos.join(" | ")}`,
    ``,
    `Tema: ${topic.label}`,
    `Etapa: ${topic.stage}. ${STAGE_GUIDE[topic.stage]}`,
    `Velocidad semanal: ${topic.velocity ?? "sin dato"}%`,
    `Por qué crece: ${topic.explanation.text}`,
    `Piezas que mejor funcionan hoy:`,
    pieces || "• (sin piezas destacadas)",
  ].join("\n");
}

export interface BriefOptions {
  llm: LLM;
  now?: Date;
}

export async function generateBrief(topic: BriefTopic, profile: Profile, opts: BriefOptions): Promise<Brief> {
  const products = profile.productos.map((p) => p.nombre) as [string, ...string[]];
  const formats = profile.formatos as [string, ...string[]];
  const schema = z.object({
    angle: z.string().min(1),
    format: z.enum(formats),
    hook: z.string().min(1),
    opportunity: z.object({ product: z.enum(products), rationale: z.string().min(1) }),
  });

  const out = await opts.llm.json({
    label: `brief-${profile.id}`,
    system: SYSTEM,
    prompt: buildPrompt(topic, profile),
    schema,
    maxTokens: 6000,
  });

  const clean = (s: string) => s.replace(/\s*—\s*/g, ", ").trim();
  return {
    profileId: profile.id,
    angle: clean(out.angle),
    format: out.format,
    hook: clean(out.hook),
    opportunity: { product: out.opportunity.product, rationale: clean(out.opportunity.rationale) },
    generatedAt: (opts.now ?? new Date()).toISOString(),
  };
}
