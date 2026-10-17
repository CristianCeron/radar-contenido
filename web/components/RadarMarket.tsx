import type { Radar, Stage } from "pipeline/schema";
import { Sparkline } from "./Sparkline";
import {
  SOURCE_LABEL,
  STAGE_HINT,
  STAGE_LABEL,
  formatDateTime,
  formatUsd,
  formatVelocity,
  isStale,
  sourceStatusText,
} from "../lib/format";

const STAGE_STYLE: Record<Stage, string> = {
  emergente: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  creciendo: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  pico: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  saturado: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      title={STAGE_HINT[stage]}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_STYLE[stage]}`}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function RadarMarket({ radar, now }: { radar: Radar; now: Date }) {
  const stale = isStale(radar.generatedAt, now);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Radar de contenido · IA</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Los temas de IA que despegan esta semana</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Qué está creciendo, en qué etapa va y por qué, con la evidencia enlazada. Ordenado por velocidad y relevancia
          para ejecutivos de Latinoamérica.
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Datos del {formatDateTime(radar.generatedAt)} · Costo de la última corrida: {formatUsd(radar.cost.totalUsd)}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {radar.sources.map((s) => (
            <li key={s.source} className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${s.status === "ok" ? "bg-emerald-400" : s.status === "ultimo_guardado" ? "bg-amber-400" : "bg-rose-400"}`}
              />
              <span className="font-medium">{SOURCE_LABEL[s.source]}</span>
              <span className="text-[var(--muted)]">{sourceStatusText(s)}</span>
            </li>
          ))}
        </ul>
      </header>

      {stale && (
        <div
          data-testid="stale-warning"
          role="status"
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          Estos datos tienen más de un día. La actualización automática no corrió a tiempo; lo que ves es el último
          resultado guardado.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="hidden grid-cols-[2.5rem_1fr_7rem_7rem_8rem_6rem] gap-4 border-b border-[var(--line)] px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)] md:grid">
          <span>#</span>
          <span>Tema</span>
          <span>Etapa</span>
          <span className="text-right">Semana</span>
          <span>30 días</span>
          <span className="text-right">Relevancia</span>
        </div>
        <ol>
          {radar.topics.map((t, i) => {
            const rising = (t.velocity ?? 0) >= 0;
            const recent = t.series.slice(-14).reduce((s, p) => s + p.count, 0);
            return (
              <li key={t.id} data-testid="topic-row" className="border-b border-[var(--line)] last:border-b-0">
                <a
                  href={`/tema/${t.id}`}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-white/[0.03] md:grid-cols-[2.5rem_1fr_7rem_7rem_8rem_6rem] md:gap-4"
                >
                  <span className="text-sm tabular-nums text-[var(--muted)]">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{recent} menciones en 14 días</span>
                  </span>
                  <span className="md:order-none">
                    <StageBadge stage={t.stage} />
                  </span>
                  <span
                    className={`col-start-2 text-sm font-semibold tabular-nums md:col-start-auto md:text-right ${rising ? "text-[var(--up)]" : "text-[var(--down)]"}`}
                  >
                    {rising ? "▲" : "▼"} {formatVelocity(t.velocity)}
                  </span>
                  <span className="col-start-3 justify-self-end md:col-start-auto md:justify-self-start">
                    <Sparkline values={t.series.map((p) => p.count)} rising={rising} />
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-[var(--muted)] md:block">
                    {Math.round(t.executiveRelevance * 100)}/100
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
        Fuentes públicas y oficiales: Hacker News, arXiv, YouTube y prensa de negocios por RSS. Sin scraping de redes
        sociales ni datos personales. "Semana" compara las menciones de los últimos 7 días con los 7 anteriores.
      </footer>
    </main>
  );
}
