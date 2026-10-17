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

// Suavizado: se suma esta cantidad a la semana anterior para que pasar de 1 a 9 menciones
// no cuente como +800% y gane a temas con cientos de menciones.
const SMOOTHING = 5;

// Cambio porcentual suavizado de la última semana frente a la anterior. Determinista, sin IA.
// Sin señal suficiente devuelve null.
export function velocity(series: SeriesPoint[]): number | null {
  if (series.length < 14) return null;
  const last = recentMentions(series, 7);
  const prev = recentMentions(series, 14) - last;
  if (last + prev < MIN_SIGNAL) return null;
  return Math.round(((last - prev) / (prev + SMOOTHING)) * 1000) / 10;
}

export function recentMentions(series: SeriesPoint[], days: number): number {
  return series.slice(-days).reduce((s, p) => s + p.count, 0);
}
