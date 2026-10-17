import { describe, it, expect } from "vitest";
import { assignTopics, isGenericLabel, labelKey } from "../src/topics.js";
import type { NormalizedItem } from "../src/schema.js";
import type { JsonRequest } from "../src/llm/types.js";
import { fakeLLM } from "./fake-llm.js";

function item(id: string, title: string, source: NormalizedItem["source"] = "hackernews"): NormalizedItem {
  return {
    id,
    source,
    layer: "origen",
    title,
    url: `https://example.com/${id}`,
    outlet: "Hacker News",
    publishedAt: "2026-10-10T00:00:00.000Z",
    metrics: {},
  };
}

const items = [
  item("1", "Show HN: framework for AI agents"),
  item("2", "Agentes de IA llegan a la banca"),
  item("3", "Our AI agent handles support tickets"),
  item("4", "Nuevo modelo de video de Google"),
  item("5", "Best pizza in Naples"),
];

const topicList = (req: JsonRequest<unknown>) => req.prompt.split("\n\nPiezas:")[0];
const ids = (req: JsonRequest<unknown>) => [...req.prompt.matchAll(/"id":"(\w+)"/g)].map((m) => m[1]);

// Número de un tema en la lista numerada del pedido ("1. Agentes de IA"); 0 si no está.
function numberOf(req: JsonRequest<unknown>, label: string): number {
  const m = topicList(req).match(new RegExp(`(\\d+)\\. ${label}`));
  return m ? Number(m[1]) : 0;
}

// Taxonomía fija y etiquetado por palabras del título; lo que no encaja queda en 0 (ninguno).
function standardLLM(taxonomy = ["Agentes de IA", "Modelos de video"]) {
  return fakeLLM((req) => {
    if (req.label === "temas-taxonomia") return { topics: taxonomy };
    const titles = new Map(items.map((i) => [i.id, i.title]));
    return {
      items: ids(req).map((id) => {
        const t = titles.get(id) ?? "";
        return { id, topic: /agent/i.test(t) ? numberOf(req, "Agentes de IA") : /video/i.test(t) ? numberOf(req, "Modelos de video") : 0 };
      }),
    };
  });
}

describe("asignación de temas", () => {
  it("unifica etiquetas casi iguales en una sola clave", () => {
    expect(labelKey("AI agents")).toBe(labelKey("agentes de IA"));
    expect(labelKey("Agentes de IA")).toBe(labelKey("agente IA"));
    expect(labelKey("Modelos de video")).toBe(labelKey("video models"));
    expect(labelKey("AI agents")).not.toBe(labelKey("modelos de video"));
  });

  it("agrupa los ítems por tema y descarta los que no son de IA", async () => {
    const groups = await assignTopics(items, standardLLM());
    expect(groups).toHaveLength(2);
    const agents = groups.find((g) => g.label === "Agentes de IA")!;
    expect(agents.id).toBe("agentes-de-ia");
    expect(agents.items.map((i) => i.id).sort()).toEqual(["1", "2", "3"]);
    expect(groups.flatMap((g) => g.items).some((i) => i.id === "5")).toBe(false);
  });

  it("primero propone una lista de temas con una muestra de títulos", async () => {
    const llm = standardLLM();
    await assignTopics(items, llm);
    expect(llm.requests[0].label).toBe("temas-taxonomia");
    expect(llm.requests[0].prompt).toContain("Show HN: framework for AI agents");
    expect(llm.requests[0].system).toMatch(/Evita categorías genéricas/);
  });

  it("etiqueta eligiendo solo de esa lista: un número fuera de la lista se descarta", async () => {
    const llm = fakeLLM((req) =>
      req.label === "temas-taxonomia" ? { topics: ["Agentes de IA"] } : { items: ids(req).map((id) => ({ id, topic: 7 })) },
    );
    const groups = await assignTopics(items, llm, { log: () => {} });
    expect(groups).toEqual([]);
    const labeling = llm.requests.find((r) => r.label === "temas-etiquetado")!;
    expect(labeling.prompt).toContain("Agentes de IA");
  });

  it("une temas casi iguales de la lista y quita los genéricos", async () => {
    const llm = standardLLM(["AI agents", "Agentes de IA", "Uso de IA", "Modelos de video"]);
    const groups = await assignTopics(items, llm);
    const labeling = llm.requests.find((r) => r.label === "temas-etiquetado")!;
    expect(topicList(labeling)).not.toContain("Uso de IA");
    expect(topicList(labeling).match(/Agentes de IA|AI agents/g)).toHaveLength(1);
    expect(groups.map((g) => g.label).sort()).toEqual(["Agentes de IA", "Modelos de video"]);
  });

  it("nunca crea un tema llamado null, ninguno u otro", async () => {
    const llm = standardLLM(["Agentes de IA", "null", "Ninguno", "Otro"]);
    await assignTopics(items, llm);
    const labeling = llm.requests.find((r) => r.label === "temas-etiquetado")!;
    expect(topicList(labeling)).not.toMatch(/\bnull\b|Ninguno|\bOtro\b/);
  });

  it("toma una muestra variada y con tope para proponer la lista", async () => {
    const many = [
      ...Array.from({ length: 900 }, (_, i) => item(`h${i}`, `HN ${i}`)),
      ...Array.from({ length: 300 }, (_, i) => item(`a${i}`, `Paper ${i}`, "arxiv")),
      ...Array.from({ length: 50 }, (_, i) => item(`p${i}`, `Prensa ${i}`, "prensa")),
    ];
    const llm = fakeLLM((req) => (req.label === "temas-taxonomia" ? { topics: ["Agentes de IA"] } : { items: [] }));
    await assignTopics(many, llm, { sampleSize: 300 });
    const prompt = llm.requests[0].prompt;
    const lines = prompt.split("\n").filter((l) => l.startsWith("- "));
    expect(lines.length).toBeLessThanOrEqual(300);
    expect(prompt).toContain("Prensa 0");
    expect(prompt).toContain("Paper 0");
  });

  it("si un lote de etiquetado falla, sigue con los demás", async () => {
    let n = 0;
    const base = standardLLM(["Agentes de IA"]);
    const llm = fakeLLM((req) => {
      if (req.label === "temas-etiquetado" && n++ === 1) throw new Error("conexión cortada");
      return base.json(req);
    });
    const groups = await assignTopics(items, llm, { batchSize: 2, log: () => {} });
    expect(groups[0].items.length).toBeGreaterThan(0);
  });

  it("ignora ids que el modelo inventa", async () => {
    const llm = fakeLLM((req) =>
      req.label === "temas-taxonomia" ? { topics: ["Agentes de IA"] } : { items: [{ id: "999", topic: 1 }] },
    );
    expect(await assignTopics([items[0]], llm)).toEqual([]);
  });

  it("reconoce etiquetas genéricas que no sirven como tema", () => {
    for (const g of ["Uso de IA", "Fundamentos de IA", "Profesionales de IA", "Experiencias con IA", "Noticias de IA", "IA en general", "Herramientas de IA"]) {
      expect(isGenericLabel(g)).toBe(true);
    }
    for (const ok of ["Agentes de IA", "Regulación de IA", "Seguridad con IA", "Robots con IA", "Modelos de video"]) {
      expect(isGenericLabel(ok)).toBe(false);
    }
  });
});
