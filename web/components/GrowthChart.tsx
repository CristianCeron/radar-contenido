"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface GrowthChartProps {
  series: { date: string; count: number }[];
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

// Curva de menciones por día de los últimos 30 días.
export function GrowthChart({ series }: GrowthChartProps) {
  return (
    <div data-testid="growth-chart" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--up)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--up)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} stroke="var(--muted)" fontSize={11} tickLine={false} interval={4} />
          <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8 }}
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v) => [`${v} menciones`, ""]}
          />
          <Area type="monotone" dataKey="count" stroke="var(--up)" strokeWidth={2} fill="url(#growth)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
