import { describe, it, expect } from "vitest";
import { selectTop, topicRelevance, topicScore } from "../src/top.js";
import type { Classification } from "../src/schema.js";

const t = (id: string, velocity: number | null, executiveRelevance: number) => ({ id, velocity, executiveRelevance });

describe("selección del top 10", () => {
  it("el puntaje es velocidad por relevancia para ejecutivos", () => {
    expect(topicScore(t("a", 100, 0.8))).toBeCloseTo(80);
    expect(topicScore(t("b", null, 0.8))).toBe(0);
  });

  it("devuelve los 10 de mayor puntaje en orden", () => {
    const topics = Array.from({ length: 15 }, (_, i) => t(`t${i}`, (i + 1) * 10, 0.5));
    const top = selectTop(topics);
    expect(top).toHaveLength(10);
    expect(top[0].id).toBe("t14");
    expect(top[9].id).toBe("t5");
    expect(top[0].score).toBeCloseTo(75);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
  });

  it("excluye los temas de relevancia muy baja aunque crezcan mucho", () => {
    const top = selectTop([t("tecnico", 900, 0.1), t("negocio", 50, 0.9), t("medio", 40, 0.5)]);
    expect(top.map((x) => x.id)).toEqual(["negocio", "medio"]);
  });

  it("excluye temas con muy pocas menciones recientes", () => {
    const top = selectTop(
      [
        { ...t("ruido", 500, 0.9), recentMentions: 4 },
        { ...t("solido", 120, 0.8), recentMentions: 40 },
      ],
      { minRecentMentions: 8 },
    );
    expect(top.map((x) => x.id)).toEqual(["solido"]);
  });

  it("excluye temas sin velocidad (sin historia)", () => {
    const top = selectTop([t("nuevo", null, 0.9), t("ok", 10, 0.9)]);
    expect(top.map((x) => x.id)).toEqual(["ok"]);
  });

  it("la relevancia de un tema es el promedio de sus ítems clasificados", () => {
    const c = (executiveRelevance: number): Classification => ({
      executiveRelevance,
      kind: "practico",
      hook: "otro",
      model: "m",
      usedFallback: false,
    });
    const classes = new Map([
      ["a", c(0.9)],
      ["b", c(0.5)],
    ]);
    expect(topicRelevance(["a", "b", "sin-clasificar"], classes)).toBeCloseTo(0.7);
    expect(topicRelevance(["x"], classes)).toBe(0);
  });
});

describe("cupo por pilar", () => {
  it("no deja que un pilar se coma el top", () => {
    const topics = [
      { ...t("ia1", 900, 0.9), pilar: "IA aplicada" },
      { ...t("ia2", 800, 0.9), pilar: "IA aplicada" },
      { ...t("ia3", 700, 0.9), pilar: "IA aplicada" },
      { ...t("ventas", 100, 0.8), pilar: "Ventas" },
      { ...t("libre", 50, 0.8) },
    ];
    const top = selectTop(topics, { maxPerPilar: 2 });
    expect(top.map((x) => x.id)).toEqual(["ia1", "ia2", "ventas", "libre"]);
  });
});
