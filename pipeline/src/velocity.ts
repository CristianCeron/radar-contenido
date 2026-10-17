import type { NormalizedItem } from "./schema.js";

export interface SeriesPoint {
  date: string;
  count: number;
}

export const SERIES_DAYS = 30;
// Menos menciones que esto en las dos últimas semanas no alcanza para hablar de velocidad.
const MIN_SIGNAL = 2;

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Menciones por día de los últimos 30 días, terminando en el día de `now` (UTC).
// Un ítem que varias fuentes mencionan cuenta una vez por fuente.
export function buildSeries(items: NormalizedItem[], now: Date, days = SERIES_DAYS): SeriesPoint[] {
  const series: SeriesPoint[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const date = utcDay(new Date(now.getTime() - i * 86400_000));
    index.set(date, series.length);
    series.push({ date, count: 0 });
  }
  for (const item of items) {
    const pos = index.get(utcDay(new Date(item.publishedAt)));
    if (pos !== undefined) series[pos].count += item.mentions?.length || 1;
  }
  return series;
}

// Cambio porcentual de la última semana frente a la anterior. Determinista, sin IA.
// Si la semana anterior está vacía se toma 1 como base; sin señal suficiente devuelve null.
export function velocity(series: SeriesPoint[]): number | null {
  if (series.length < 14) return null;
  const sum = (pts: SeriesPoint[]) => pts.reduce((s, p) => s + p.count, 0);
  const last = sum(series.slice(-7));
  const prev = sum(series.slice(-14, -7));
  if (last + prev < MIN_SIGNAL) return null;
  const base = Math.max(prev, 1);
  return Math.round(((last - base) / base) * 1000) / 10;
}
