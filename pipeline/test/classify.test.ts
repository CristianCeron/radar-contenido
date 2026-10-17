import { describe, it, expect, vi } from "vitest";
import { createJevClassifier } from "../src/classify/jev.js";
import { createLLMClassifier } from "../src/classify/fallback.js";
import { classifyWithFallback, type Classifier } from "../src/classify/index.js";
import { ClassificationSchema, type NormalizedItem } from "../src/schema.js";
import { CostLimitExceeded } from "../src/cost.js";
import { fakeFetch } from "./helpers.js";
import { fakeLLM } from "./fake-llm.js";

const items: NormalizedItem[] = [
  {
    id: "yt:1",
    source: "youtube",
    layer: "difusion",
    title: "Cómo un gerente usa agentes de IA para ahorrar 10 horas",
    url: "https://www.youtube.com/watch?v=1",
    outlet: "Canal",
    publishedAt: "2026-10-10T00:00:00.000Z",
    metrics: {},
  },
  {
    id: "arxiv:2",
    source: "arxiv",
    layer: "origen",
    title: "Sparse mixture of experts with adaptive routing",
    url: "https://arxiv.org/abs/2610.00002",
    outlet: "arXiv",
    publishedAt: "2026-10-11T00:00:00.000Z",
    metrics: {},
  },
];

function jevAnswer(title: string) {
  const practical = title.includes("gerente");
  return {
    model: "jev-1.13.0",
    answers: {
      executive_relevance: { type: "score", score: practical ? 3.6 : 0.4, confidence: 0.8, legend: [], probabilities: {} },
      kind: { type: "choice", choice: practical ? "practico" : "tecnico", confidence: 0.9, probabilities: {} },
      hook: { type: "choice", choice: practical ? "caso_de_uso" : "otro", confidence: 0.7, probabilities: {} },
    },
    usage: { input_tokens: 120, output_tokens: 20 },
    cost: 0.000005,
  };
}

describe("clasificador JEV por Eden AI", () => {
  it("devuelve relevancia, tipo y gancho por ítem", async () => {
    const f = fakeFetch(() => ({ body: "" }));
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      f.calls.push(url);
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(jevAnswer(String(body.state.title))), { status: 200 });
    }) as typeof fetch;
    const costs: number[] = [];
    const jev = createJevClassifier({ apiKey: "k", fetch: fetchImpl, onCost: (c) => costs.push(c.usd) });

    const out = await jev.classify(items);

    expect(out.get("yt:1")).toMatchObject({ kind: "practico", hook: "caso_de_uso", model: "jev-1.13.0" });
    expect(out.get("yt:1")!.executiveRelevance).toBeCloseTo(0.9);
    expect(out.get("arxiv:2")).toMatchObject({ kind: "tecnico" });
    expect(out.get("arxiv:2")!.executiveRelevance).toBeLessThan(0.2);
    expect(f.calls[0]).toBe("https://api.edenai.run/v3/alpha/decisions");
    expect(costs).toEqual([0.000005, 0.000005]);
  });

  it("envía el modelo, el estado y las preguntas tipadas", async () => {
    let sent: Record<string, any> = {};
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer k");
      return new Response(JSON.stringify(jevAnswer("x")), { status: 200 });
    }) as typeof fetch;
    await createJevClassifier({ apiKey: "k", fetch: fetchImpl }).classify([items[1]]);
    expect(sent.model).toBe("typesafe/jev-latest");
    expect(sent.state.title).toBe(items[1].title);
    expect(sent.questions.executive_relevance.type).toBe("score");
    expect(sent.questions.kind.criteria).toHaveProperty("practico");
    expect(sent.questions.hook.type).toBe("choice");
  });

  it("lanza error si Eden AI responde con error", async () => {
    const fetchImpl = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    await expect(createJevClassifier({ apiKey: "k", fetch: fetchImpl }).classify(items)).rejects.toThrow();
  });
});

describe("clasificador de respaldo con modelo de lenguaje", () => {
  it("clasifica un lote con la misma interfaz", async () => {
    const llm = fakeLLM(() => ({
      items: [
        { id: "yt:1", executiveRelevance: 0.85, kind: "practico", hook: "caso_de_uso" },
        { id: "arxiv:2", executiveRelevance: 0.1, kind: "tecnico", hook: "otro" },
      ],
    }));
    const out = await createLLMClassifier(llm).classify(items);
    expect(out.get("yt:1")).toMatchObject({ kind: "practico", model: "modelo-falso" });
    expect(out.size).toBe(2);
    expect(llm.requests[0].prompt).toContain("yt:1");
  });
});

describe("clasificación con respaldo", () => {
  const okFallback: Classifier = {
    name: "respaldo",
    classify: async (batch) =>
      new Map(batch.map((i) => [i.id, { executiveRelevance: 0.5, kind: "practico" as const, hook: "otro" as const, model: "respaldo" }])),
  };

  it("usa JEV cuando funciona y no marca respaldo", async () => {
    const primary: Classifier = {
      name: "jev",
      classify: async (batch) =>
        new Map(batch.map((i) => [i.id, { executiveRelevance: 0.7, kind: "tecnico" as const, hook: "noticia" as const, model: "jev" }])),
    };
    const out = await classifyWithFallback(items, { primary, fallback: okFallback });
    for (const c of out.values()) {
      expect(ClassificationSchema.safeParse(c).success).toBe(true);
      expect(c.usedFallback).toBe(false);
    }
  });

  it("si JEV falla usa el respaldo y lo registra", async () => {
    const log = vi.fn();
    const primary: Classifier = { name: "jev", classify: async () => Promise.reject(new Error("caído")) };
    const out = await classifyWithFallback(items, { primary, fallback: okFallback, log });
    expect([...out.values()].every((c) => c.usedFallback && c.model === "respaldo")).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("respaldo"));
  });

  it("si JEV excede el tiempo usa el respaldo", async () => {
    const primary: Classifier = { name: "jev", classify: () => new Promise(() => {}) };
    const out = await classifyWithFallback(items, { primary, fallback: okFallback, timeoutMs: 20 });
    expect(out.get("yt:1")?.usedFallback).toBe(true);
  });

  it("si se supera el tope de costo no usa el respaldo y detiene la corrida", async () => {
    const primary: Classifier = { name: "jev", classify: async () => Promise.reject(new CostLimitExceeded(2, 1)) };
    const fallback = { ...okFallback, classify: vi.fn(okFallback.classify) };
    await expect(classifyWithFallback(items, { primary, fallback })).rejects.toBeInstanceOf(CostLimitExceeded);
    expect(fallback.classify).not.toHaveBeenCalled();
  });

  it("completa con el respaldo los ítems que JEV no devolvió", async () => {
    const primary: Classifier = {
      name: "jev",
      classify: async () => new Map([["yt:1", { executiveRelevance: 0.9, kind: "practico" as const, hook: "tutorial" as const, model: "jev" }]]),
    };
    const out = await classifyWithFallback(items, { primary, fallback: okFallback });
    expect(out.get("yt:1")?.usedFallback).toBe(false);
    expect(out.get("arxiv:2")?.usedFallback).toBe(true);
  });
});
