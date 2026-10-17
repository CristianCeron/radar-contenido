interface SparklineProps {
  values: number[];
  rising?: boolean;
  className?: string;
}

const W = 140;
const H = 36;

// Puntos de la línea en un lienzo de 140 x 36, con la serie real del tema.
export function sparkPoints(values: number[]): string {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  return values.map((v, i) => `${(i * step).toFixed(1)},${(33 - (v / max) * 30).toFixed(1)}`).join(" ");
}

// Mini gráfico de 30 días: negro si el tema sube, violeta si baja.
export function Sparkline({ values, rising = true, className = "" }: SparklineProps) {
  return (
    <svg
      data-testid="sparkline"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Menciones de los últimos ${values.length} días`}
      className={`block ${className}`}
    >
      <polyline
        points={sparkPoints(values)}
        fill="none"
        stroke={rising ? "#0a0a0a" : "#7b6be6"}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
