import type { Source, SourceStatus, Stage } from "pipeline/schema";

const TZ = "America/Bogota";
const STALE_HOURS = 36;

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}

export function formatUsd(usd: number): string {
  return `USD ${usd.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatVelocity(v: number | null): string {
  if (v === null) return "sin dato";
  const n = Math.round(v);
  return n >= 0 ? `+${n} %` : `−${Math.abs(n)} %`;
}

// La actualización es diaria: con más de 36 horas, algo falló y la página lo avisa.
export function isStale(generatedAt: string, now: Date): boolean {
  return now.getTime() - new Date(generatedAt).getTime() > STALE_HOURS * 3600_000;
}

export const STAGE_LABEL: Record<Stage, string> = {
  emergente: "Emergente",
  creciendo: "Creciendo",
  pico: "Pico",
  saturado: "Saturado",
};

export const STAGE_HINT: Record<Stage, string> = {
  emergente: "Solo aparece donde nacen los temas (foros técnicos e investigación).",
  creciendo: "Ya llegó a YouTube: se está difundiendo.",
  pico: "Ya llegó a la prensa de negocios: todos hablan de él.",
  saturado: "Está en prensa pero cayendo: llega tarde.",
};

export const SOURCE_LABEL: Record<Source, string> = {
  hackernews: "Hacker News",
  arxiv: "arXiv",
  youtube: "YouTube",
  prensa: "Prensa",
  equipo: "Aportes del equipo",
};

export function sourceStatusText(s: SourceStatus): string {
  switch (s.status) {
    case "ok":
      return `${s.items} piezas`;
    case "ultimo_guardado":
      return `último guardado del ${formatDate(s.fetchedAt)}`;
    case "cupo_agotado":
      return "cupo agotado";
    default:
      return "sin datos hoy";
  }
}
