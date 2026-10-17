import { createAnthropicLLM } from "./anthropic.js";
import { createGeminiLLM } from "./gemini.js";
import type { CostSink, LLM } from "./types.js";

export type { CostSink, CostEntry, JsonRequest, LLM } from "./types.js";

// live: brief en vivo desde la página; necesita responder en pocos segundos.
export type LLMRole = "fast" | "writer" | "live";

function envPrice(name: string): { input: number; output: number } | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const [input, output] = raw.split(",").map(Number);
  return Number.isFinite(input) && Number.isFinite(output) ? { input, output } : undefined;
}

// El proveedor y los modelos se eligen por variables de entorno.
// gemini: opción sin costo (nivel gratuito o créditos de Google Cloud).
// anthropic: modo calidad, recomendado para explicaciones y briefs más precisos.
export function createLLM(role: LLMRole, onCost?: CostSink): LLM {
  const provider = process.env.LLM_PROVIDER ?? "gemini";
  const fast = role === "fast";

  if (provider === "gemini") {
    const model = fast
      ? process.env.GEMINI_MODEL_FAST
      : role === "live"
        ? process.env.GEMINI_MODEL_LIVE || process.env.GEMINI_MODEL_WRITER
        : process.env.GEMINI_MODEL_WRITER;
    if (!model) throw new Error(`Falta ${fast ? "GEMINI_MODEL_FAST" : "GEMINI_MODEL_WRITER"} en el .env`);
    const backend = process.env.GEMINI_BACKEND || "aistudio";
    if (backend !== "aistudio" && backend !== "vertex") throw new Error(`GEMINI_BACKEND no soportado: ${backend}`);
    return createGeminiLLM({
      model,
      backend,
      price: envPrice(fast ? "GEMINI_PRICE_FAST" : role === "live" ? "GEMINI_PRICE_LIVE" : "GEMINI_PRICE_WRITER"),
      onCost,
    });
  }

  if (provider === "anthropic") {
    const model = fast
      ? process.env.LLM_MODEL_FAST || "claude-haiku-5-5"
      : process.env.LLM_MODEL_WRITER || "claude-opus-5-5";
    return createAnthropicLLM({ model, effort: fast ? "low" : "medium", onCost });
  }

  throw new Error(`LLM_PROVIDER no soportado: ${provider} (usa gemini o anthropic)`);
}
