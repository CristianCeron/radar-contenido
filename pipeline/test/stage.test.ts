import { describe, it, expect } from "vitest";
import { assignStage, layerCounts, presentLayers } from "../src/stage.js";
import type { NormalizedItem } from "../src/schema.js";

const L = (origen: number, difusion: number, audiencia_ejecutiva: number) => ({ origen, difusion, audiencia_ejecutiva });

describe("regla de etapa", () => {
  const cases: [string, ReturnType<typeof L>, number | null, string][] = [
    ["solo en origen con velocidad alta", L(12, 0, 0), 150, "emergente"],
    ["en origen y difusión", L(10, 4, 0), 80, "creciendo"],
    ["solo en difusión", L(0, 5, 0), 20, "creciendo"],
    ["en difusión y prensa ejecutiva", L(8, 6, 3), 30, "pico"],
    ["prensa ejecutiva sin historia de velocidad", L(0, 2, 2), null, "pico"],
    ["en prensa ejecutiva con velocidad negativa", L(4, 6, 5), -35, "saturado"],
    ["solo en prensa ejecutiva cayendo", L(0, 0, 3), -10, "saturado"],
  ];

  for (const [name, layers, vel, expected] of cases) {
    it(`${name} es ${expected}`, () => {
      expect(assignStage({ layers, velocity: vel })).toBe(expected);
    });
  }

  it("los umbrales son configurables", () => {
    // Con mínimo de 3 menciones por capa, 2 en difusión no cuentan: queda emergente.
    expect(assignStage({ layers: L(10, 2, 0), velocity: 50 }, { minLayerMentions: 3 })).toBe("emergente");
    // Con umbral de saturación en -50, una caída de 20 sigue siendo pico.
    expect(assignStage({ layers: L(4, 6, 5), velocity: -20 }, { saturationVelocity: -50 })).toBe("pico");
  });

  it("cuenta menciones por capa a partir de las fuentes de cada ítem", () => {
    const item = (mentions: NormalizedItem["mentions"]): NormalizedItem => ({
      id: Math.random().toString(),
      source: "hackernews",
      layer: "origen",
      title: "x",
      url: "https://example.com",
      outlet: "HN",
      publishedAt: "2026-10-10T00:00:00.000Z",
      metrics: {},
      mentions,
    });
    const counts = layerCounts([
      item([
        { source: "hackernews", url: "https://a.com", outlet: "HN" },
        { source: "youtube", url: "https://b.com", outlet: "Canal" },
      ]),
      item([{ source: "prensa", url: "https://c.com", outlet: "Portafolio" }]),
      item(undefined),
    ]);
    expect(counts).toEqual(L(2, 1, 1));
    expect(presentLayers(counts)).toEqual(["origen", "difusion", "audiencia_ejecutiva"]);
  });
});
