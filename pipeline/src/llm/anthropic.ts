import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { tokenCost } from "./pricing.js";
import type { CostSink, JsonRequest, LLM } from "./types.js";

export interface AnthropicLLMOptions {
  model: string;
  effort?: "low" | "medium" | "high";
  client?: Anthropic;
  onCost?: CostSink;
}

export function createAnthropicLLM(opts: AnthropicLLMOptions): LLM {
  const client = opts.client ?? new Anthropic();

  return {
    model: opts.model,
    async json<T>(req: JsonRequest<T>): Promise<T> {
      const response = await client.messages.parse({
        model: opts.model,
        max_tokens: req.maxTokens ?? 8000,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
        output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(req.schema) },
      });

      opts.onCost?.({
        label: req.label,
        model: opts.model,
        usd: tokenCost(opts.model, response.usage.input_tokens, response.usage.output_tokens),
      });

      if (response.stop_reason === "refusal") {
        throw new Error(`El modelo rechazó la solicitud (${req.label})`);
      }
      if (response.parsed_output == null) {
        throw new Error(`Respuesta sin JSON válido (${req.label}, stop_reason=${response.stop_reason})`);
      }
      return response.parsed_output as T;
    },
  };
}
