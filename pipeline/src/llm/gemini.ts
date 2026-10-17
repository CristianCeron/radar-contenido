import { z } from "zod";
import type { CostSink, JsonRequest, LLM } from "./types.js";

// aistudio: Gemini API (nivel gratuito o saldo prepagado de AI Studio).
// vertex: Agent Platform de Google Cloud; consume los créditos de la cuenta de facturación.
const ENDPOINTS = {
  aistudio: "https://generativelanguage.googleapis.com/v1beta/models",
  vertex: "https://aiplatform.googleapis.com/v1/publishers/google/models",
};

export type GeminiBackend = keyof typeof ENDPOINTS;

export interface GeminiLLMOptions {
  model: string;
  backend?: GeminiBackend;
  apiKey?: string;
  fetch?: typeof fetch;
  // Dólares por millón de tokens. Sin precio se asume el nivel gratuito (costo 0).
  price?: { input: number; output: number };
  onCost?: CostSink;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

// El nivel gratuito limita llamadas por minuto: ante 429 o 503 se espera y se reintenta.
const RETRYABLE = new Set([429, 500, 503]);

function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

export function createGeminiLLM(opts: GeminiLLMOptions): LLM {
  const doFetch = opts.fetch ?? fetch;
  const maxRetries = opts.maxRetries ?? 4;
  const retryDelayMs = opts.retryDelayMs ?? 5000;

  return {
    model: opts.model,
    async json<T>(req: JsonRequest<T>): Promise<T> {
      const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY ?? "";
      if (!apiKey) throw new Error("Falta GEMINI_API_KEY");

      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchemaFor(req.schema),
          maxOutputTokens: req.maxTokens ?? 8000,
        },
      });

      let res: Response | undefined;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        res = await doFetch(`${ENDPOINTS[opts.backend ?? "aistudio"]}/${opts.model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body,
        });
        if (!RETRYABLE.has(res.status) || attempt === maxRetries) break;
        await new Promise((r) => setTimeout(r, retryDelayMs * 2 ** attempt));
      }
      if (!res!.ok) throw new Error(`Gemini respondió ${res!.status} (${req.label}): ${(await res!.text()).slice(0, 200)}`);

      const data = (await res!.json()) as GeminiResponse;
      const usage = data.usageMetadata ?? {};
      const price = opts.price ?? { input: 0, output: 0 };
      const outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
      opts.onCost?.({
        label: req.label,
        model: opts.model,
        usd: ((usage.promptTokenCount ?? 0) * price.input + outputTokens * price.output) / 1_000_000,
      });

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) {
        const reason = data.promptFeedback?.blockReason ?? candidate?.finishReason ?? "sin contenido";
        throw new Error(`Gemini no devolvió respuesta (${req.label}): ${reason}`);
      }
      return req.schema.parse(JSON.parse(text));
    },
  };
}
