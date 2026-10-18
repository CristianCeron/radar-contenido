"use client";

import Link from "next/link";
import { useState } from "react";
import type { Topic } from "pipeline/schema";
import { PilarChip, RelevanceBar, StageBadge, VelocityBadge } from "./badges";
import { Sparkline } from "./Sparkline";
import { mentions14 } from "../lib/format";
import { PILARES } from "../lib/pilares";

const ALL = "Todos";

// En celular cada tema es una tarjeta; desde lg la misma fila se acomoda como tabla.
const ROW_GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] [grid-template-areas:'pos_label_vel''spark_spark_spark''meta_meta_meta'] gap-x-3 gap-y-3.5 " +
  "lg:grid-cols-[48px_minmax(0,3fr)_120px_110px_140px_100px_140px_48px] lg:[grid-template-areas:'pos_label_stage_vel_spark_m14_rel_go'] lg:gap-4 lg:items-center";

function Row({ topic, pos }: { topic: Topic; pos: number }) {
  const rising = (topic.velocity ?? 0) >= 0;
  const m14 = mentions14(topic.series);
  return (
    <li data-testid="topic-row">
      <Link
        href={`/tema/${topic.id}`}
        className={`group ${ROW_GRID} rounded-[22px] bg-white p-[18px] text-ink transition-colors lg:rounded-none lg:border-b lg:border-[#f1efea] lg:px-6 lg:hover:bg-[#fafaf6]`}
      >
        <span className="pt-0.5 text-sm font-semibold text-muted [grid-area:pos] lg:pt-0 lg:text-[15px]">{pos}</span>
        <span className="flex min-w-0 flex-col gap-1.5 [grid-area:label]">
          <span className="text-[17px] font-semibold leading-tight tracking-[-0.01em] lg:text-lg">{topic.label}</span>
          {topic.pilar && <PilarChip pilar={topic.pilar} />}
        </span>
        <VelocityBadge velocity={topic.velocity} className="self-start [grid-area:vel] lg:self-center" />
        <Sparkline values={topic.series.map((p) => p.count)} rising={rising} className="h-10 w-full [grid-area:spark] lg:h-9 lg:w-[140px]" />
        <span className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2 text-[13px] text-[#5c574d] [grid-area:meta] lg:contents">
          <StageBadge stage={topic.stage} className="lg:[grid-area:stage]" />
          <span className="order-last basis-full whitespace-nowrap lg:hidden">{`${m14} menciones en 14 días`}</span>
          <span className="hidden text-[17px] font-semibold text-ink lg:block lg:[grid-area:m14]">{m14}</span>
          <span className="inline-flex items-center gap-1.5 lg:hidden">
            Relevancia <b className="text-[15px] text-ink">{Math.round(topic.executiveRelevance * 100)}</b>
          </span>
          <span className="hidden lg:block lg:[grid-area:rel]">
            <RelevanceBar value={topic.executiveRelevance} />
          </span>
        </span>
        <span className="hidden h-10 w-10 items-center justify-center rounded-full border border-line transition-colors [grid-area:go] group-hover:border-accent group-hover:bg-accent lg:inline-flex">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.75" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </li>
  );
}

// Título de columna con una línea corta que dice qué mide, para no depender de abreviaturas.
function Columna({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>{titulo}</span>
      <span className="text-[11px] leading-tight font-normal tracking-normal text-muted normal-case">{detalle}</span>
    </span>
  );
}

// Filtros por pilar y la lista de temas. El orden viene del pipeline (velocidad por relevancia).
export function RadarList({ topics, initialPilar = ALL }: { topics: Topic[]; initialPilar?: string }) {
  const [pilar, setPilar] = useState(initialPilar);
  const positions = new Map(topics.map((t, i) => [t.id, i + 1]));
  const shown = pilar === ALL ? topics : topics.filter((t) => t.pilar === pilar);

  return (
    <>
      <div role="group" aria-label="Filtrar por pilar" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {[ALL, ...PILARES].map((name) => {
          const on = name === pilar;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => setPilar(name)}
              className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                on ? "border-ink bg-ink text-accent" : "border-line-2 bg-white text-ink hover:border-ink"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {shown.length > 0 ? (
        <div className="lg:overflow-x-auto lg:rounded-3xl lg:bg-white">
          <div className="lg:min-w-[980px]">
            <div
              aria-hidden
              className="hidden grid-cols-[48px_minmax(0,3fr)_120px_110px_140px_100px_140px_48px] items-end gap-4 border-b border-line px-6 py-4 text-xs font-semibold uppercase tracking-[.06em] text-muted-2 lg:grid"
            >
              <span>#</span>
              <span>Tema</span>
              <span>Etapa</span>
              <Columna titulo="Semana" detalle="frente a la anterior" />
              <Columna titulo="30 días" detalle="menciones por día" />
              <Columna titulo="Menciones" detalle="últimos 14 días" />
              <Columna titulo="Relevancia" detalle="para founders, 0 a 100" />
              <span />
            </div>
            <ol className="flex flex-col gap-3 lg:block">
              {shown.map((t) => (
                <Row key={t.id} topic={t} pos={positions.get(t.id) ?? 0} />
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3.5 rounded-3xl bg-white p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-soft">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#868073" strokeWidth="1.25" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="4" />
              <path d="M12 12l5-5" />
            </svg>
          </div>
          <span className="text-xl font-semibold">Nada en este pilar todavía</span>
          <span className="leading-snug text-[#5c574d]">Ningún tema de {pilar} entró al top 10 esta semana. Prueba con otro pilar.</span>
          <button
            type="button"
            onClick={() => setPilar(ALL)}
            className="min-h-11 cursor-pointer rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-hover"
          >
            Ver todos los temas
          </button>
        </div>
      )}
    </>
  );
}
