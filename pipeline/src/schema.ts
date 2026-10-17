import { z } from "zod";

// Capas de difusión de un tema: dónde nace, dónde se masifica y cuándo llega a ejecutivos.
export const LayerSchema = z.enum(["origen", "difusion", "audiencia_ejecutiva"]);
export type Layer = z.infer<typeof LayerSchema>;

// "equipo" es el sensor humano: publicaciones de redes que el equipo reporta a mano.
// "expertos" son newsletters y blogs de expertos (growth, ventas, liderazgo) por RSS.
export const SourceSchema = z.enum(["hackernews", "arxiv", "youtube", "prensa", "equipo", "expertos"]);
export type Source = z.infer<typeof SourceSchema>;

export const LAYER_BY_SOURCE: Record<Source, Layer> = {
  hackernews: "origen",
  arxiv: "origen",
  youtube: "difusion",
  prensa: "audiencia_ejecutiva",
  // Valor por defecto; cada reporte del equipo trae la capa de su plataforma.
  equipo: "difusion",
  expertos: "origen",
};

export const StageSchema = z.enum(["emergente", "creciendo", "pico", "saturado"]);
export type Stage = z.infer<typeof StageSchema>;

const Url = z.url({ protocol: /^https?$/ });
const IsoDate = z.iso.datetime({ offset: true });

export const MentionSchema = z.object({
  source: SourceSchema,
  url: Url,
  outlet: z.string(),
  layer: LayerSchema.optional(),
});
export type Mention = z.infer<typeof MentionSchema>;

export const NormalizedItemSchema = z.object({
  id: z.string().min(1),
  source: SourceSchema,
  layer: LayerSchema,
  title: z.string().min(1),
  url: Url,
  // Nombre público del canal, medio o sitio. Nunca un perfil personal.
  outlet: z.string(),
  publishedAt: IsoDate,
  summary: z.string().optional(),
  metrics: z
    .object({
      points: z.number().optional(),
      comments: z.number().optional(),
      views: z.number().optional(),
    })
    .default({}),
  // Todas las fuentes que mencionan el mismo contenido, tras deduplicar.
  mentions: z.array(MentionSchema).optional(),
});
export type NormalizedItem = z.infer<typeof NormalizedItemSchema>;

export const HookTypeSchema = z.enum([
  "dato_sorprendente",
  "tutorial",
  "noticia",
  "opinion",
  "caso_de_uso",
  "comparativa",
  "advertencia",
  "otro",
]);
export type HookType = z.infer<typeof HookTypeSchema>;

export const ClassificationSchema = z.object({
  executiveRelevance: z.number().min(0).max(1),
  kind: z.enum(["practico", "tecnico"]),
  hook: HookTypeSchema,
  model: z.string(),
  usedFallback: z.boolean(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export const EvidenceSchema = z.object({
  title: z.string().min(1),
  url: Url,
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const SeriesPointSchema = z.object({
  date: z.iso.date(),
  count: z.number().int().min(0),
});

export const ChannelSchema = z.object({
  name: z.string(),
  source: SourceSchema,
  url: Url.optional(),
  count: z.number().int().min(1),
});

export const PieceSchema = z.object({
  title: z.string(),
  url: Url,
  source: SourceSchema,
  outlet: z.string(),
  hook: HookTypeSchema,
  format: z.string(),
  analysis: z.string().optional(),
});

export const BriefSchema = z.object({
  profileId: z.string(),
  angle: z.string().min(1),
  format: z.string().min(1),
  hook: z.string().min(1),
  opportunity: z.object({
    product: z.string().min(1),
    rationale: z.string().min(1),
  }),
  generatedAt: IsoDate,
});
export type Brief = z.infer<typeof BriefSchema>;

export const TopicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stage: StageSchema,
  // Pilar del tema dentro de la temática de la marca (por ejemplo "Ventas"), si el tema define pilares.
  pilar: z.string().optional(),
  // Cambio porcentual de la última semana frente a la anterior. Null si no hay historia.
  velocity: z.number().nullable(),
  executiveRelevance: z.number().min(0).max(1),
  score: z.number(),
  layers: z.array(LayerSchema).min(1),
  series: z.array(SeriesPointSchema).length(30),
  channels: z.array(ChannelSchema),
  topPieces: z.array(PieceSchema),
  explanation: z.object({
    text: z.string().min(1),
    evidence: z.array(EvidenceSchema).min(1),
  }),
  briefs: z.record(z.string(), BriefSchema),
});
export type Topic = z.infer<typeof TopicSchema>;

export const SourceStatusSchema = z.object({
  source: SourceSchema,
  status: z.enum(["ok", "ultimo_guardado", "cupo_agotado", "error"]),
  fetchedAt: IsoDate,
  items: z.number().int().min(0),
});
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const ProfileRefSchema = z.object({ id: z.string(), nombre: z.string() });

export const RadarSchema = z.object({
  generatedAt: IsoDate,
  windowDays: z.literal(30),
  cost: z.object({
    totalUsd: z.number().min(0),
    limitUsd: z.number().min(0),
    calls: z.number().int().min(0),
  }),
  sources: z.array(SourceStatusSchema),
  profiles: z.array(ProfileRefSchema),
  topics: z.array(TopicSchema).max(10),
});
export type Radar = z.infer<typeof RadarSchema>;
