import type { SourceStatus, Stage } from "pipeline/schema";
import { SOURCE_LABEL, STAGE_HINT, STAGE_LABEL, formatVelocity, sourceStatusText } from "../lib/format";

const STAGE_CLASS: Record<Stage, string> = {
  emergente: "bg-accent text-ink",
  creciendo: "bg-stage-creciendo text-ink",
  pico: "bg-ink text-white",
  saturado: "bg-stage-saturado text-stage-saturado-text",
};

export function StageBadge({ stage, className = "" }: { stage: Stage; className?: string }) {
  return (
    <span
      data-stage={stage}
      title={`${STAGE_LABEL[stage]}: ${STAGE_HINT[stage]}`}
      className={`inline-flex items-center justify-self-start rounded-full px-3 py-1.5 text-[13px] font-semibold ${STAGE_CLASS[stage]} ${className}`}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function VelocityBadge({ velocity, className = "" }: { velocity: number | null; className?: string }) {
  if (velocity === null) {
    return <span className={`text-[15px] text-muted ${className}`}>sin dato</span>;
  }
  const up = velocity >= 0;
  return (
    <span
      className={`inline-flex items-center justify-self-start whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-base font-semibold ${
        up ? "bg-up-bg text-up-text" : "bg-down-bg text-down-text"
      } ${className}`}
    >
      {up ? "▲" : "▼"} {formatVelocity(velocity)}
    </span>
  );
}

// Relevancia para founders y ejecutivos, de 0 a 100.
export function RelevanceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-7 text-right text-base font-semibold">{pct}</span>
    </span>
  );
}

type ChipState = "ok" | "ultimo_guardado" | "caida";

function chipState(s: SourceStatus): ChipState {
  if (s.status === "ok") return "ok";
  if (s.status === "ultimo_guardado") return "ultimo_guardado";
  return "caida";
}

const CHIP_CLASS: Record<ChipState, string> = {
  ok: "bg-ink-3 text-[#d9d5cb] border-ink-line",
  ultimo_guardado: "bg-cache/12 text-cache border-cache/40",
  caida: "bg-fail/12 text-fail border-fail/40",
};

const DOT_CLASS: Record<ChipState, string> = { ok: "bg-ok", ultimo_guardado: "bg-cache", caida: "bg-fail" };

// Verde: al día. Amarillo: se usa el último guardado. Violeta: fuente caída.
export function SourceChips({ sources }: { sources: SourceStatus[] }) {
  return (
    <ul aria-label="Estado de las fuentes" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {sources.map((s) => {
        const state = chipState(s);
        const detail = state === "ok" ? String(s.items) : sourceStatusText(s);
        return (
          <li
            key={s.source}
            data-status={state}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] ${CHIP_CLASS[state]}`}
          >
            <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${DOT_CLASS[state]}`} />
            {SOURCE_LABEL[s.source]} · {detail}
          </li>
        );
      })}
    </ul>
  );
}

export function PilarChip({ pilar, dark = false }: { pilar: string; dark?: boolean }) {
  return (
    <span
      data-testid="pilar"
      className={`inline-flex self-start rounded-full px-2.5 py-[3px] text-xs font-medium ${
        dark ? "bg-accent/12 text-accent" : "bg-paper text-body"
      }`}
    >
      {pilar}
    </span>
  );
}
