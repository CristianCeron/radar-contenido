import type { Classification } from "./schema.js";

export interface Rankable {
  velocity: number | null;
  executiveRelevance: number;
  // Menciones de las últimas dos semanas, para descartar temas con muy poco volumen.
  recentMentions?: number;
  // Pilar del tema (por ejemplo "Ventas"); sirve para que ningún pilar se coma el top.
  pilar?: string;
}

export interface TopConfig {
  limit: number;
  // Temas por debajo de esta relevancia para ejecutivos no entran al top aunque crezcan.
  minRelevance: number;
  // Temas con menos menciones recientes que esto son ruido aunque su velocidad sea alta.
  minRecentMentions: number;
  // Máximo de temas del mismo pilar en el top. Sin valor, no hay cupo.
  maxPerPilar?: number;
}

export const DEFAULT_TOP_CONFIG: TopConfig = { limit: 10, minRelevance: 0.3, minRecentMentions: 0 };

export function topicScore(t: Rankable): number {
  if (t.velocity === null) return 0;
  return Math.round(t.velocity * t.executiveRelevance * 100) / 100;
}

export function topicRelevance(itemIds: string[], classifications: Map<string, Classification>): number {
  const values = itemIds.map((id) => classifications.get(id)?.executiveRelevance).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function selectTop<T extends Rankable>(topics: T[], config: Partial<TopConfig> = {}): (T & { score: number })[] {
  const cfg = { ...DEFAULT_TOP_CONFIG, ...config };
  const ranked = topics
    .filter((t) => t.velocity !== null && t.executiveRelevance >= cfg.minRelevance)
    .filter((t) => (t.recentMentions ?? Infinity) >= cfg.minRecentMentions)
    .map((t) => ({ ...t, score: topicScore(t) }))
    .sort((a, b) => b.score - a.score);

  const perPilar = new Map<string, number>();
  const top: (T & { score: number })[] = [];
  for (const t of ranked) {
    if (top.length >= cfg.limit) break;
    if (cfg.maxPerPilar && t.pilar) {
      const n = perPilar.get(t.pilar) ?? 0;
      if (n >= cfg.maxPerPilar) continue;
      perPilar.set(t.pilar, n + 1);
    }
    top.push(t);
  }
  return top;
}
