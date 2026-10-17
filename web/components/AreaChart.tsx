import { formatSeriesDate } from "../lib/format";

const W = 1160;
const TOP = 20;
const BASE = 220;

// Trazos del gráfico en un lienzo de 1160 x 240: la serie va de la línea base (220) al máximo (20).
export function areaPaths(values: number[]): { line: string; area: string; max: number } {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(BASE - (v / max) * (BASE - TOP)).toFixed(1)}`);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${W}.0,${BASE} L0.0,${BASE} Z`;
  return { line, area, max };
}

// Menciones por día de los últimos 30 días, con la serie real del tema.
export function AreaChart({ series }: { series: { date: string; count: number }[] }) {
  const values = series.map((p) => p.count);
  const { line, area, max } = areaPaths(values);
  const total = values.reduce((s, v) => s + v, 0);
  const mid = series[Math.floor((series.length - 1) / 2)];

  return (
    <div data-testid="growth-chart" className="flex flex-col gap-3">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} 240`}
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
        </svg>
        <span className="absolute top-0 right-0 -translate-y-1/2 rounded-full bg-white px-1.5 text-xs text-muted-2">{max}</span>
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
