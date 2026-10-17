// Precios en dólares por millón de tokens (entrada, salida). Fuente: tabla de modelos de Anthropic, octubre de 2026.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export function tokenCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model];
  if (!price) throw new Error(`Sin precio configurado para el modelo ${model}`);
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
