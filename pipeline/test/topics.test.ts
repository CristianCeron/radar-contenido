import { describe, it, expect } from "vitest";
import { assignTopics, isGenericLabel, labelKey } from "../src/topics.js";
import type { NormalizedItem } from "../src/schema.js";
import { fakeLLM } from "./fake-llm.js";

function item(id: string, title: string): NormalizedItem {
  return {
    id,
    source: "hackernews",
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

describe("asignación de temas", () => {
  it("unifica etiquetas casi iguales en una sola clave", () => {
    expect(labelKey("AI agents")).toBe(labelKey("agentes de IA"));
    expect(labelKey("Agentes de IA")).toBe(labelKey("agente IA"));
    expect(labelKey("Modelos de video")).toBe(labelKey("video models"));
    expect(labelKey("AI agents")).not.toBe(labelKey("modelos de video"));
  });

  it("agrupa los ítems por tema y descarta los que no son de IA", async () => {
    const llm = fakeLLM((req) => {
      if (req.label === "temas-etiquetado") {
        return {
          items: [
            { id: "1", topic: "AI agents" },
            { id: "2", topic: "Agentes de IA" },
            { id: "3", topic: "agentes de IA" },
            { id: "4", topic: "Modelos de video" },
            { id: "5", topic: null },
          ],
        };
      }
      return { merges: [] };
    });

    const groups = await assignTopics(items, llm);

    expect(groups).toHaveLength(2);
    const agents = groups.find((g) => g.items.length === 3)!;
    expect(agents.items.map((i) => i.id).sort()).toEqual(["1", "2", "3"]);
    // La etiqueta visible es la forma más usada.
    expect(agents.label).toBe("Agentes de IA");
    expect(agents.id).toBe("agentes-de-ia");
    expect(groups.flatMap((g) => g.items).some((i) => i.id === "5")).toBe(false);
  });

  it("aplica las fusiones de sinónimos que propone el modelo", async () => {
    const llm = fakeLLM((req) => {
      if (req.label === "temas-etiquetado") {
        return {
          items: [
            { id: "1", topic: "Agentes de IA" },
            { id: "2", topic: "Agentes autónomos" },
            { id: "4", topic: "Modelos de video" },
          ],
        };
      }
      return { merges: [{ canonical: "Agentes de IA", aliases: ["Agentes autónomos"] }] };
    });
    const groups = await assignTopics([items[0], items[1], items[3]], llm);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.label === "Agentes de IA")?.items).toHaveLength(2);
  });

  it("etiqueta por lotes y pasa las etiquetas ya usadas al siguiente lote", async () => {
    const llm = fakeLLM((req) => {
      if (req.label !== "temas-etiquetado") return { merges: [] };
      const ids = [...req.prompt.matchAll(/"id":"(\w+)"/g)].map((m) => m[1]);
      return { items: ids.map((id) => ({ id, topic: "Agentes de IA" })) };
    });
    await assignTopics(items, llm, { batchSize: 2 });
    const labeling = llm.requests.filter((r) => r.label === "temas-etiquetado");
    expect(labeling).toHaveLength(3);
    expect(labeling[1].prompt).toContain("Agentes de IA");
  });

  it("si un lote de etiquetado falla, sigue con los demás", async () => {
    let n = 0;
    const llm = fakeLLM((req) => {
      if (req.label !== "temas-etiquetado") return { merges: [] };
      if (n++ === 1) throw new Error("conexión cortada");
      const ids = [...req.prompt.matchAll(/"id":"(\w+)"/g)].map((m) => m[1]);
      return { items: ids.map((id) => ({ id, topic: "Agentes de IA" })) };
    });
    const groups = await assignTopics(items, llm, { batchSize: 2, log: () => {} });
    expect(groups[0].items).toHaveLength(3);
  });

  it("reconoce etiquetas genéricas que no sirven como tema", () => {
    for (const g of ["Uso de IA", "Fundamentos de IA", "Profesionales de IA", "Experiencias con IA", "Noticias de IA", "IA en general", "Herramientas de IA"]) {
      expect(isGenericLabel(g)).toBe(true);
    }
    for (const ok of ["Agentes de IA", "Regulación de IA", "Seguridad con IA", "Robots con IA", "Modelos de video"]) {
      expect(isGenericLabel(ok)).toBe(false);
    }
  });

  it("pide temas concretos y no categorías genéricas", async () => {
    const llm = fakeLLM((req) => (req.label === "temas-etiquetado" ? { items: [] } : { merges: [] }));
    await assignTopics([items[0]], llm);
    expect(llm.requests[0].system).toMatch(/Evita categorías genéricas/);
  });

  it("ignora ids que el modelo inventa", async () => {
    const llm = fakeLLM((req) =>
      req.label === "temas-etiquetado" ? { items: [{ id: "999", topic: "Agentes de IA" }] } : { merges: [] },
    );
    const groups = await assignTopics([items[0]], llm);
    expect(groups).toEqual([]);
  });
});
