import type { JsonRequest, LLM } from "../src/llm/types.js";

// Modelo falso: responde con lo que devuelva el manejador y valida contra el esquema pedido.
export function fakeLLM(
  handler: (req: JsonRequest<unknown>) => unknown | Promise<unknown>,
  model = "modelo-falso",
): LLM & { requests: JsonRequest<unknown>[] } {
  const requests: JsonRequest<unknown>[] = [];
  return {
    model,
    requests,
    async json<T>(req: JsonRequest<T>): Promise<T> {
      requests.push(req as JsonRequest<unknown>);
      const raw = await handler(req as JsonRequest<unknown>);
      return req.schema.parse(raw);
    },
  };
}
