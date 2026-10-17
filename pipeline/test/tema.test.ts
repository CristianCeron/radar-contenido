import { describe, it, expect, afterEach } from "vitest";
import { buildPressFilter, loadTema, sourcesFor } from "../src/tema.js";
import { isAboutAI } from "../src/sources/rss.js";
import { assignTopics } from "../src/topics.js";
import { fakeLLM } from "./fake-llm.js";

const now = new Date("2026-10-17T06:00:00Z");

describe("tema configurable", () => {
  afterEach(() => {
    delete process.env.RADAR_TEMA;
  });

  it("por defecto el tema es inteligencia artificial, con las mismas búsquedas de siempre", () => {
    const tema = loadTema();
    expect(tema.nombre).toBe("inteligencia artificial");
    expect(tema.hackernews).toContain("AI agents");
    expect(tema.youtube).toContain("agentes de IA");
    expect(tema.arxiv).toEqual(["cs.AI", "cs.CL", "cs.LG", "cs.MA"]);
  });

  it("el filtro de prensa del tema por defecto se comporta igual que el de IA", () => {
    const matches = buildPressFilter(loadTema());
    for (const text of [
      "Meta presenta nuevos modelos de inteligencia artificial",
      "Crédito para IA se encarece",
      "Netflix despedirá a 1.000 empleados",
      "La iniciativa del gobierno",
    ]) {
      expect(matches(text)).toBe(isAboutAI(text));
    }
  });

  it("RADAR_TEMA elige otro archivo de tema sin tocar código", () => {
    process.env.RADAR_TEMA = "emprendimiento";
    const tema = loadTema();
    expect(tema.nombre).toBe("emprendimiento y fundraising en Latinoamérica");
    const matches = buildPressFilter(tema);
    expect(matches("Startup colombiana cierra ronda de inversión Serie A")).toBe(true);
    expect(matches("Receta de arepas de la abuela")).toBe(false);
  });

  it("un tema que no existe falla con un mensaje claro", () => {
    process.env.RADAR_TEMA = "no-existe";
    expect(() => loadTema()).toThrow(/no-existe/);
  });

  it("si el tema no tiene categorías de arXiv, esa fuente no se consulta", () => {
    process.env.RADAR_TEMA = "emprendimiento";
    const sources = sourcesFor(loadTema(), now);
    expect(Object.keys(sources).sort()).toEqual(["hackernews", "prensa", "youtube"]);
    delete process.env.RADAR_TEMA;
    expect(Object.keys(sourcesFor(loadTema(), now)).sort()).toEqual(["arxiv", "hackernews", "prensa", "youtube"]);
  });

  it("la agrupación de temas usa el nombre del tema en sus instrucciones", async () => {
    const llm = fakeLLM((req) => (req.label === "temas-taxonomia" ? { topics: ["Rondas de inversión"] } : { items: [] }));
    const item = {
      id: "1",
      source: "hackernews" as const,
      layer: "origen" as const,
      title: "Startup cierra ronda",
      url: "https://example.com/1",
      outlet: "HN",
      publishedAt: "2026-10-10T00:00:00.000Z",
      metrics: {},
    };
    await assignTopics([item], llm, { tema: "emprendimiento y fundraising en Latinoamérica" });
    expect(llm.requests[0].system).toContain("emprendimiento y fundraising en Latinoamérica");
    expect(llm.requests[0].system).not.toContain("inteligencia artificial");
  });
});

describe("tema crecimiento de empresas", () => {
  afterEach(() => {
    delete process.env.RADAR_TEMA;
  });

  it("tiene audiencia de founders, expertos en origen y un arXiv pequeño", () => {
    process.env.RADAR_TEMA = "crecimiento";
    const tema = loadTema();
    expect(tema.nombre).toMatch(/crecimiento/i);
    expect(tema.audiencia).toMatch(/founder/i);
    expect(tema.expertos.length).toBeGreaterThan(3);
    expect(tema.arxiv).toEqual(["cs.AI", "econ.GN"]);
    expect(tema.arxivMax).toBeLessThanOrEqual(100);
    expect(Object.keys(sourcesFor(tema, now)).sort()).toEqual(["arxiv", "expertos", "hackernews", "prensa", "youtube"]);
  });

  it("el filtro de prensa del tema reconoce notas de negocio", () => {
    process.env.RADAR_TEMA = "crecimiento";
    const matches = buildPressFilter(loadTema());
    expect(matches("Cómo construir un equipo de ventas B2B que escale")).toBe(true);
    expect(matches("Startup mexicana levanta ronda Serie B para expandirse a Colombia")).toBe(true);
    expect(matches("Resultados del partido de fútbol del domingo")).toBe(false);
  });

  it("el tema por defecto conserva su audiencia y no consulta expertos", () => {
    const tema = loadTema();
    expect(tema.expertos).toEqual([]);
    expect(tema.audiencia).toMatch(/IA/);
    expect(Object.keys(sourcesFor(tema, now))).not.toContain("expertos");
  });
});

describe("pilares del tema crecimiento", () => {
  afterEach(() => {
    delete process.env.RADAR_TEMA;
  });

  it("trae los ocho pilares de la Inmersión y un cupo de 2 por pilar", () => {
    process.env.RADAR_TEMA = "crecimiento";
    const tema = loadTema();
    expect(tema.pilares).toHaveLength(8);
    expect(tema.pilares).toContain("IA aplicada al negocio");
    expect(tema.maxPorPilar).toBe(2);
  });
});
