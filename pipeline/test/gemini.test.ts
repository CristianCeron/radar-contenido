import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createGeminiLLM } from "../src/llm/gemini.js";
import { createLLM } from "../src/llm/index.js";

const schema = z.object({ angle: z.string(), score: z.number() });

function geminiResponse(text: string, finishReason = "STOP") {
  return {
    candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason }],
    usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, totalTokenCount: 1200 },
  };
}

function recordingFetch(responses: { status?: number; body: unknown }[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  let i = 0;
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("adaptador Gemini", () => {
  it("pide JSON con el esquema y devuelve el objeto validado", async () => {
    const { fn, calls } = recordingFetch([{ body: geminiResponse('{"angle":"Ángulo","score":0.8}') }]);
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn });

    const out = await llm.json({ label: "brief", system: "Sistema", prompt: "Hola", schema });

    expect(out).toEqual({ angle: "Ángulo", score: 0.8 });
    expect(calls[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect((calls[0].init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.systemInstruction.parts[0].text).toBe("Sistema");
    expect(body.contents[0].parts[0].text).toBe("Hola");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.properties).toHaveProperty("angle");
  });

  it("con backend vertex llama a Agent Platform con la misma clave", async () => {
    const { fn, calls } = recordingFetch([{ body: geminiResponse('{"angle":"a","score":1}') }]);
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn, backend: "vertex" });
    await llm.json({ label: "x", system: "s", prompt: "p", schema });
    expect(calls[0].url).toBe("https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-test:generateContent");
    expect((calls[0].init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
  });

  it("reporta el costo según tokens y la tabla de precios", async () => {
    const { fn } = recordingFetch([{ body: geminiResponse('{"angle":"a","score":1}') }]);
    const costs: number[] = [];
    const llm = createGeminiLLM({
      model: "gemini-test",
      apiKey: "k",
      fetch: fn,
      price: { input: 0.5, output: 2 },
      onCost: (c) => costs.push(c.usd),
    });
    await llm.json({ label: "x", system: "s", prompt: "p", schema });
    expect(costs[0]).toBeCloseTo((1000 * 0.5 + 200 * 2) / 1_000_000);
  });

  it("reintenta cuando el nivel gratuito responde 429", async () => {
    const { fn, calls } = recordingFetch([
      { status: 429, body: { error: { code: 429, status: "RESOURCE_EXHAUSTED" } } },
      { body: geminiResponse('{"angle":"a","score":1}') },
    ]);
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn, retryDelayMs: 1 });
    await expect(llm.json({ label: "x", system: "s", prompt: "p", schema })).resolves.toEqual({ angle: "a", score: 1 });
    expect(calls).toHaveLength(2);
  });

  it("reintenta cuando se corta la conexión", async () => {
    let n = 0;
    const fn = (async () => {
      if (n++ === 0) throw new TypeError("fetch failed");
      return new Response(JSON.stringify(geminiResponse('{"angle":"a","score":1}')));
    }) as unknown as typeof fetch;
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn, retryDelayMs: 1 });
    await expect(llm.json({ label: "x", system: "s", prompt: "p", schema })).resolves.toEqual({ angle: "a", score: 1 });
    expect(n).toBe(2);
  });

  it("lanza error si la respuesta no cumple el esquema", async () => {
    const { fn } = recordingFetch([{ body: geminiResponse('{"angle":"a"}') }]);
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn });
    await expect(llm.json({ label: "x", system: "s", prompt: "p", schema })).rejects.toThrow();
  });

  it("lanza error si el modelo bloquea la respuesta", async () => {
    const { fn } = recordingFetch([{ body: { candidates: [{ finishReason: "SAFETY" }] } }]);
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "k", fetch: fn });
    await expect(llm.json({ label: "x", system: "s", prompt: "p", schema })).rejects.toThrow(/SAFETY/);
  });

  it("sin clave lanza error claro", async () => {
    const llm = createGeminiLLM({ model: "gemini-test", apiKey: "" });
    await expect(llm.json({ label: "x", system: "s", prompt: "p", schema })).rejects.toThrow(/GEMINI_API_KEY/);
  });
});

describe("selección de proveedor", () => {
  it("usa Gemini cuando LLM_PROVIDER=gemini", () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_MODEL_FAST = "gemini-rapido";
    process.env.GEMINI_MODEL_WRITER = "gemini-redactor";
    try {
      expect(createLLM("fast").model).toBe("gemini-rapido");
      expect(createLLM("writer").model).toBe("gemini-redactor");
    } finally {
      delete process.env.LLM_PROVIDER;
      delete process.env.GEMINI_MODEL_FAST;
      delete process.env.GEMINI_MODEL_WRITER;
    }
  });

  it("lee el backend de GEMINI_BACKEND", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_BACKEND = "vertex";
    process.env.GEMINI_MODEL_FAST = "gemini-rapido";
    process.env.GEMINI_API_KEY = "k";
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify(geminiResponse('{"angle":"a","score":1}')));
    }) as unknown as typeof fetch;
    try {
      await createLLM("fast").json({ label: "x", system: "s", prompt: "p", schema });
      expect(calls[0]).toContain("aiplatform.googleapis.com");
    } finally {
      globalThis.fetch = original;
      for (const k of ["LLM_PROVIDER", "GEMINI_BACKEND", "GEMINI_MODEL_FAST", "GEMINI_API_KEY"]) delete process.env[k];
    }
  });

  it("rechaza un proveedor desconocido", () => {
    process.env.LLM_PROVIDER = "otro";
    try {
      expect(() => createLLM("fast")).toThrow(/LLM_PROVIDER/);
    } finally {
      delete process.env.LLM_PROVIDER;
    }
  });
});
