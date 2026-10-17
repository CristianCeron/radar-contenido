import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { RadarSchema, NormalizedItemSchema } from "../src/schema.js";

const sample = JSON.parse(
  readFileSync(new URL("./fixtures/radar-ejemplo.json", import.meta.url), "utf8"),
);

describe("esquema de radar.json", () => {
  it("acepta un radar de ejemplo completo", () => {
    const result = RadarSchema.safeParse(sample);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it("rechaza un tema cuya explicación no tiene evidencia enlazada", () => {
    const bad = structuredClone(sample);
    bad.topics[0].explanation.evidence = [];
    expect(RadarSchema.safeParse(bad).success).toBe(false);
  });

  it("rechaza evidencia con enlace inválido", () => {
    const bad = structuredClone(sample);
    bad.topics[0].explanation.evidence[0].url = "no-es-un-enlace";
    expect(RadarSchema.safeParse(bad).success).toBe(false);
  });

  it("exige una serie de 30 días", () => {
    const bad = structuredClone(sample);
    bad.topics[0].series = bad.topics[0].series.slice(0, 10);
    expect(RadarSchema.safeParse(bad).success).toBe(false);
  });

  it("valida un ítem normalizado", () => {
    const ok = NormalizedItemSchema.safeParse({
      id: "hn:1",
      source: "hackernews",
      layer: "origen",
      title: "Show HN: agente",
      url: "https://news.ycombinator.com/item?id=1",
      outlet: "Hacker News",
      publishedAt: "2026-10-10T12:00:00.000Z",
      metrics: { points: 10, comments: 2 },
    });
    expect(ok.success).toBe(true);
  });
});
