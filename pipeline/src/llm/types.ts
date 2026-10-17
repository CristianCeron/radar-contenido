import type { z } from "zod";

export interface CostEntry {
  label: string;
  model: string;
  usd: number;
}

// Recibe el costo de cada llamada externa. El control de costo (Tarea 14) lo implementa.
export type CostSink = (entry: CostEntry) => void;

export interface JsonRequest<T> {
  label: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

// Interfaz mínima que usa el pipeline para pedir JSON validado a un modelo de lenguaje.
export interface LLM {
  model: string;
  json<T>(req: JsonRequest<T>): Promise<T>;
}
