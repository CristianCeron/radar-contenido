import type { HookType, Source, SourceStatus, Stage } from "pipeline/schema";

const TZ = "America/Bogota";
const STALE_HOURS = 36;

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: TZ }).format(new Date(iso));
}

// "17 de octubre", sin el año, para chips y avisos.
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
}

// Fechas de la serie ("2026-10-17"), que son días sin hora: se leen en UTC para no correrse un día.
export function formatSeriesDate(ymd: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));
}

// Separa la palabra que va en serif itálica: la última de al menos 5 letras.
export function splitSerif(label: string): [string, string, string] {
  const words = label.split(" ");
  let i = words.length - 1;
  while (i > 0 && words[i].replace(/[^\p{L}]/gu, "").length < 5) i--;
  const before = words.slice(0, i).join(" ");
  const after = words.slice(i + 1).join(" ");
  return [before ? `${before} ` : "", words[i], after ? ` ${after}` : ""];
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

// Menciones de las últimas dos semanas, la columna "Menciones 14 d" del radar.
export function mentions14(series: { count: number }[]): number {
  return series.slice(-14).reduce((s, p) => s + p.count, 0);
}

export const STAGE_LABEL: Record<Stage, string> = {
  emergente: "Emergente",
  creciendo: "Creciendo",
  pico: "Pico",
  saturado: "Saturado",
};

// Qué significa cada etapa para quien va a publicar. Las etapas salen de las capas a las que
// llegó el tema: origen (foros, expertos, investigación), difusión (YouTube) y prensa de negocios.
export const STAGE_HINT: Record<Stage, string> = {
  emergente:
    "solo aparece donde nacen los temas: foros de founders, newsletters de expertos e investigación. Si publicas ahora, llegas primero.",
  creciendo:
    "ya pasó de los foros a YouTube y todavía no llega a la prensa de negocios. Buen momento para publicar con un ángulo propio.",
  pico: "ya llegó a la prensa de negocios y todos hablan de él. Para destacar necesitas un ángulo propio.",
  saturado: "está en la prensa, pero sus menciones vienen cayendo. Publica solo si tienes algo nuevo que decir.",
};

export const SOURCE_LABEL: Record<Source, string> = {
  hackernews: "Hacker News",
  arxiv: "arXiv",
  youtube: "YouTube",
  prensa: "Prensa de negocios",
  equipo: "Aportes del equipo",
  expertos: "Newsletters de expertos",
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

export const HOOK_LABEL: Record<HookType, string> = {
  dato_sorprendente: "dato sorprendente",
  tutorial: "tutorial",
  noticia: "noticia",
  opinion: "opinión",
  caso_de_uso: "caso de uso",
  comparativa: "comparativa",
  advertencia: "advertencia",
  otro: "otro",
};
