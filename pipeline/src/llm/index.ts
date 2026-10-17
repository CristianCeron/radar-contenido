import { createAnthropicLLM } from "./anthropic.js";
import type { CostSink, LLM } from "./types.js";

export type { CostSink, CostEntry, JsonRequest, LLM } from "./types.js";

export type LLMRole = "fast" | "writer";

// El proveedor y los modelos se eligen por variables de entorno (LLM_PROVIDER, LLM_MODEL_FAST, LLM_MODEL_WRITER).
export function createLLM(role: LLMRole, onCost?: CostSink): LLM {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  if (provider !== "anthropic") throw new Error(`LLM_PROVIDER no soportado: ${provider}`);

  const model =
    role === "fast"
      ? process.env.LLM_MODEL_FAST || "claude-haiku-5-5"
      : process.env.LLM_MODEL_WRITER || "claude-opus-5-5";
  return createAnthropicLLM({ model, effort: role === "fast" ? "low" : "medium", onCost });
}
