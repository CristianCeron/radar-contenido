"use client";

import { useState } from "react";
import { formatSeriesDate } from "../lib/format";

const W = 1160;
const H = 240;
const TOP = 20;
const BASE = 220;

type Punto = { date: string; count: number };

const yDe = (v: number, max: number) => BASE - (v / max) * (BASE - TOP);

// Trazos del gráfico en un lienzo de 1160 x 240: la serie va de la línea base (220) al máximo (20).
export function areaPaths(values: number[]): { line: string; area: string; max: number } {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${yDe(v, max).toFixed(1)}`);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${W}.0,${BASE} L0.0,${BASE} Z`;
  return { line, area, max };
}

// Día más cercano a una posición horizontal, dada como fracción del ancho (0 a 1).
export function nearestIndex(fraccion: number, n: number): number {
  if (n <= 1) return 0;
  return Math.min(n - 1, Math.max(0, Math.round(fraccion * (n - 1))));
}

// "12 de octubre · 21 menciones", con singular cuando es una sola.
export function pointLabel(p: Punto): string {
  return `${formatSeriesDate(p.date)} · ${p.count} ${p.count === 1 ? "mención" : "menciones"}`;
}

// Menciones por día de los últimos 30 días, con la serie real del tema. Al pasar el mouse, tocar o
// usar las flechas del teclado muestra el día y cuántas menciones tuvo.
export function AreaChart({ series, activoInicial = null }: { series: Punto[]; activoInicial?: number | null }) {
  const [activo, setActivo] = useState<number | null>(activoInicial);
  const values = series.map((p) => p.count);
  const { line, area, max } = areaPaths(values);
  const total = values.reduce((s, v) => s + v, 0);
  const mid = series[Math.floor((series.length - 1) / 2)];
  const n = series.length;
  const xPct = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);

  function desdePuntero(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width > 0) setActivo(nearestIndex((e.clientX - r.left) / r.width, n));
  }

  function conTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    const actual = activo ?? n - 1;
    const destino =
      e.key === "ArrowLeft" ? actual - 1 : e.key === "ArrowRight" ? actual + 1 : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (destino === null) return;
    e.preventDefault();
    setActivo(Math.min(n - 1, Math.max(0, destino)));
  }

  const p = activo !== null ? series[activo] : null;
  const x = activo !== null ? xPct(activo) : 0;
  const yPct = p ? (yDe(p.count, max) / H) * 100 : 0;
  // La etiqueta va arriba del punto, o debajo si el punto está muy arriba; y no se sale por los lados.
  const alinear = x < 12 ? "translate-x-0" : x > 88 ? "-translate-x-full" : "-translate-x-1/2";
  const vertical = yPct < 30 ? "translate-y-3" : "-translate-y-[calc(100%+12px)]";

  return (
    <div data-testid="growth-chart" className="flex flex-col gap-3">
      <div
        className="relative cursor-crosshair touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        tabIndex={0}
        aria-label="Menciones por día. Usa las flechas para recorrer los días."
        onPointerMove={desdePuntero}
        onPointerDown={desdePuntero}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}
        onKeyDown={conTeclado}
        onFocus={() => setActivo((a) => a ?? n - 1)}
        onBlur={() => setActivo(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Menciones por día en los últimos ${series.length} días: ${total} en total, máximo de ${max} en un día.`}
          className="block h-[160px] w-full sm:h-[240px]"
        >
          <defs>
            <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff6a2b" stopOpacity=".9" />
              <stop offset="1" stopColor="#ff6a2b" stopOpacity=".1" />
            </linearGradient>
          </defs>
          <line x1="0" y1={TOP} x2={W} y2={TOP} stroke="#f1efea" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={(TOP + BASE) / 2} x2={W} y2={(TOP + BASE) / 2} stroke="#f1efea" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="#d9d5cb" vectorEffect="non-scaling-stroke" />
          <path d={area} fill="url(#area-fill)" />
          <path d={line} fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {p && (
            <line
              data-testid="chart-cursor"
              x1={(x / 100) * W}
              y1={TOP - 10}
              x2={(x / 100) * W}
              y2={BASE}
              stroke="#0a0a0a"
              strokeOpacity=".35"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <span className="absolute top-0 right-0 -translate-y-1/2 rounded-full bg-white px-1.5 text-xs text-muted-2">{max}</span>
        {p && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-[0_0_0_1px_#0a0a0a]"
              style={{ left: `${x}%`, top: `${yPct}%` }}
            />
            <span
              data-testid="chart-tooltip"
              aria-hidden
              className={`pointer-events-none absolute rounded-xl bg-ink px-3 py-2 text-[13px] font-semibold whitespace-nowrap text-white shadow-[0_8px_24px_rgba(10,10,10,.25)] ${alinear} ${vertical}`}
              style={{ left: `${x}%`, top: `${yPct}%` }}
            >
              {pointLabel(p)}
            </span>
          </>
        )}
        <span aria-live="polite" className="sr-only">
          {p ? pointLabel(p) : ""}
        </span>
      </div>
      {series.length > 0 && (
        <div className="flex justify-between text-[13px] text-muted-2">
          <span>{formatSeriesDate(series[0].date)}</span>
          <span className="hidden sm:inline">{formatSeriesDate(mid.date)}</span>
          <span>{formatSeriesDate(series[series.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}
