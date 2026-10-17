interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  rising?: boolean;
}

// Mini gráfico de 30 días sin librerías: una línea y un área suave.
export function Sparkline({ values, width = 120, height = 32, rising = true }: SparklineProps) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`);
  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const color = rising ? "var(--up)" : "var(--down)";

  return (
    <svg
      data-testid="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Menciones de los últimos ${values.length} días`}
      className="block"
    >
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
