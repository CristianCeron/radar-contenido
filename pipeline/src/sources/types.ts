import type { NormalizedItem } from "../schema.js";

export type SourceStatusKind = "ok" | "cupo_agotado" | "error";

export interface SourceResult {
  status: SourceStatusKind;
  items: NormalizedItem[];
  error?: string;
}

export interface SourceOptions {
  fetch?: typeof fetch;
  now?: Date;
}

export const WINDOW_DAYS = 30;

export function windowStart(now: Date, days = WINDOW_DAYS): Date {
  return new Date(now.getTime() - days * 86400 * 1000);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
