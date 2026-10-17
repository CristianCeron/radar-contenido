import { describe, it, expect } from "vitest";
import { buildSeries, velocity } from "../src/velocity.js";
import type { NormalizedItem } from "../src/schema.js";

const now = new Date("2026-10-17T06:00:00Z");

function at(daysAgo: number, mentions = 1): NormalizedItem {
  const d = new Date(now.getTime() - daysAgo * 86400_000);
  return {
    id: `${daysAgo}-${Math.random()}`,
    source: "hackernews",
    layer: "origen",
    title: "x",
    url: "https://example.com",
    outlet: "Hacker News",
    publishedAt: d.toISOString(),
    metrics: {},
    mentions: Array.from({ length: mentions }, () => ({ source: "hackernews" as const, url: "https://example.com", outlet: "HN" })),
  };
}

describe("series de tiempo", () => {
  it("devuelve 30 días terminando hoy, con menciones por día", () => {
    const series = buildSeries([at(0), at(0), at(1, 3), at(29)], now);
    expect(series).toHaveLength(30);
    expect(series[29]).toEqual({ date: "2026-10-17", count: 2 });
    expect(series[28]).toEqual({ date: "2026-10-16", count: 3 });
    expect(series[0]).toEqual({ date: "2026-09-18", count: 1 });
  });

  it("ignora ítems fuera de la ventana", () => {
    const series = buildSeries([at(31), at(-2)], now);
    expect(series.reduce((s, p) => s + p.count, 0)).toBe(0);
  });
});

describe("velocidad", () => {
  it("crecimiento: compara la última semana con la anterior", () => {
    const items = [...Array(6)].map((_, i) => at(i % 7)).concat([at(8), at(10)]);
    expect(velocity(buildSeries(items, now))).toBeCloseTo(200);
  });

  it("caída: velocidad negativa", () => {
    const items = [at(1), at(2), at(3)].concat([...Array(6)].map(() => at(9)));
    expect(velocity(buildSeries(items, now))).toBeCloseTo(-50);
  });

  it("tema nuevo sin semana anterior crece desde una base de 1", () => {
    const items = [at(0), at(1), at(2)];
    expect(velocity(buildSeries(items, now))).toBeCloseTo(200);
  });

  it("sin historia la velocidad es nula, no un error", () => {
    expect(velocity(buildSeries([], now))).toBeNull();
    expect(velocity(buildSeries([at(1)], now))).toBeNull();
    expect(velocity([])).toBeNull();
  });
});
