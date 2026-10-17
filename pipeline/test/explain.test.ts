import { describe, it, expect } from "vitest";
import { buildChannels, explainTopic, rankPieces } from "../src/explain.js";
import type { Classification, NormalizedItem } from "../src/schema.js";
import { fakeLLM } from "./fake-llm.js";

function item(id: string, over: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    id,
    source: "hackernews",
    layer: "origen",
    title: `Pieza ${id}`,
    url: `https://example.com/${id}`,
    outlet: "Hacker News",
    publishedAt: "2026-10-10T00:00:00.000Z",
    metrics: {},
    ...over,
  };
}

const items = [
  item("hn1", { metrics: { points: 300, comments: 120 } }),
  item("yt1", { source: "youtube", layer: "difusion", outlet: "Canal IA", metrics: { views: 900000, comments: 3000 } }),
  item("yt2", { source: "youtube", layer: "difusion", outlet: "Canal IA", metrics: { views: 1000 } }),
  item("pr1", { source: "prensa", layer: "audiencia_ejecutiva", outlet: "Portafolio" }),
];

const cls = (hook: Classification["hook"]): Classification => ({
  executiveRelevance: 0.8,
  kind: "practico",
  hook,
  model: "jev",
  usedFallback: false,
});
const classifications = new Map([
  ["hn1", cls("opinion")],
  ["yt1", cls("tutorial")],
  ["pr1", cls("noticia")],
]);

const topic = { label: "Agentes de IA", stage: "creciendo" as const, velocity: 80, items };

describe("explicación con evidencia y análisis de gancho", () => {
  it("acepta una explicación con evidencia y conserva sus enlaces", async () => {
    const llm = fakeLLM(() => ({
      text: "Crece porque las empresas ya los usan en soporte — y en ventas.",
      evidenceIds: ["e1", "e2", "e99"],
      pieces: [{ id: "e2", format: "tutorial en video largo", analysis: "Promete un resultado en el título y lo demuestra rápido." }],
    }));
    const res = await explainTopic(topic, { llm, classifications });

    expect(res).not.toBeNull();
    const urls = res!.explanation.evidence.map((e) => e.url);
    expect(urls).toHaveLength(2);
    for (const u of urls) expect(items.map((i) => i.url)).toContain(u);
    expect(res!.explanation.text).not.toContain("—");
  });

  it("descarta una explicación que llega sin enlaces a evidencia", async () => {
    const llm = fakeLLM(() => ({ text: "Crece mucho.", evidenceIds: [], pieces: [] }));
    expect(await explainTopic(topic, { llm, classifications })).toBeNull();
  });

  it("descarta una explicación cuya evidencia no está entre lo recolectado", async () => {
    const llm = fakeLLM(() => ({ text: "Crece mucho.", evidenceIds: ["e42"], pieces: [] }));
    expect(await explainTopic(topic, { llm, classifications })).toBeNull();
  });

  it("adjunta gancho y formato a las piezas principales", async () => {
    const llm = fakeLLM((req) => {
      const yt = req.prompt.split("\n").find((l) => l.includes("Canal IA") && l.includes("yt1"))!;
      const id = yt.match(/"ref":"(e\d+)"/)![1];
      return {
        text: "Crece por los tutoriales.",
        evidenceIds: [id],
        pieces: [{ id, format: "video largo", analysis: "Usa una promesa concreta." }],
      };
    });
    const res = await explainTopic(topic, { llm, classifications });
    const piece = res!.topPieces.find((p) => p.url.endsWith("/yt1"))!;
    expect(piece).toMatchObject({ hook: "tutorial", format: "video largo", analysis: "Usa una promesa concreta.", outlet: "Canal IA" });
    expect(res!.topPieces.length).toBeLessThanOrEqual(5);
  });

  it("solo le pasa al modelo la evidencia recolectada", async () => {
    const llm = fakeLLM(() => ({ text: "x", evidenceIds: ["e1"], pieces: [] }));
    await explainTopic(topic, { llm, classifications });
    const prompt = llm.requests[0].prompt;
    for (const i of items) expect(prompt).toContain(i.url);
    expect(llm.requests[0].system).toMatch(/solo.*evidencia/i);
  });
});

describe("aportes del equipo en la explicación", () => {
  const sensor = item("eq1", {
    source: "equipo",
    layer: "audiencia_ejecutiva",
    title: "Gerente cuenta cómo usa agentes para vender",
    url: "https://www.linkedin.com/posts/maria-perez_x",
    outlet: "LinkedIn, aportes del equipo",
  });

  it("usa la descripción como contexto, sin el enlace, y nunca como evidencia ni pieza", async () => {
    const llm = fakeLLM((req) => {
      const refsFound = [...req.prompt.matchAll(/"ref":"(e\d+)"/g)].map((m) => m[1]);
      return { text: "Crece.", evidenceIds: refsFound, pieces: refsFound.map((id) => ({ id, format: "f", analysis: "a" })) };
    });
    const res = await explainTopic({ ...topic, items: [...items, sensor] }, { llm, classifications });
    const prompt = llm.requests[0].prompt;
    expect(prompt).toContain("Gerente cuenta cómo usa agentes para vender");
    expect(prompt).not.toContain("linkedin.com/posts");
    expect(res!.explanation.evidence.map((e) => e.url)).not.toContain(sensor.url);
    expect(res!.topPieces.map((p) => p.url)).not.toContain(sensor.url);
  });

  it("si un tema solo tiene aportes del equipo no hay evidencia enlazable y se descarta", async () => {
    const llm = fakeLLM(() => ({ text: "Crece.", evidenceIds: ["e1"], pieces: [] }));
    expect(await explainTopic({ ...topic, items: [sensor] }, { llm, classifications })).toBeNull();
  });

  it("los canales del equipo no llevan enlace", () => {
    const ch = buildChannels([sensor]);
    expect(ch[0]).toMatchObject({ name: "LinkedIn, aportes del equipo", source: "equipo", count: 1 });
    expect(ch[0].url).toBeUndefined();
  });
});

describe("quiénes hablan del tema", () => {
  it("ordena las piezas por interacción y variedad de fuentes", () => {
    const ranked = rankPieces(items, 3);
    expect(ranked.map((i) => i.id)).toEqual(["yt1", "hn1", "pr1"]);
  });

  it("agrupa canales y medios públicos con su cantidad", () => {
    const channels = buildChannels(items);
    expect(channels[0]).toMatchObject({ name: "Canal IA", source: "youtube", count: 2 });
    expect(channels.map((c) => c.name)).toEqual(expect.arrayContaining(["Hacker News", "Portafolio"]));
  });
});
