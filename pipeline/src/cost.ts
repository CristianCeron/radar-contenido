import type { CostEntry, CostSink } from "./llm/types.js";

export class CostLimitExceeded extends Error {
  constructor(
    readonly totalUsd: number,
    readonly limitUsd: number,
  ) {
    super(`Costo de la corrida (USD ${totalUsd.toFixed(4)}) superó el límite de USD ${limitUsd.toFixed(2)}`);
    this.name = "CostLimitExceeded";
  }
}

export interface CostSummary {
  totalUsd: number;
  limitUsd: number;
  calls: number;
}

export interface CostTracker {
  sink: CostSink;
  totalUsd(): number;
  calls(): number;
  byLabel(): Record<string, number>;
  summary(): CostSummary;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function createCostTracker({ limitUsd }: { limitUsd: number }): CostTracker {
  const entries: CostEntry[] = [];
  let total = 0;

  return {
    sink(entry) {
      entries.push(entry);
      total += entry.usd;
      if (total > limitUsd) throw new CostLimitExceeded(round(total), limitUsd);
    },
    totalUsd: () => round(total),
    calls: () => entries.length,
    byLabel() {
      const out: Record<string, number> = {};
      for (const e of entries) out[e.label] = round((out[e.label] ?? 0) + e.usd);
      return out;
    },
    summary: () => ({ totalUsd: round(total), limitUsd, calls: entries.length }),
  };
}

export type GuardedResult = CostSummary & { status: "ok" | "cost_limit" };

// Ejecuta una corrida con tope de costo. Si lo supera, no escribe nada: queda el resultado anterior.
export async function runWithCostLimit<T>(opts: {
  limitUsd: number;
  run: (sink: CostSink, tracker: CostTracker) => Promise<T>;
  write: (result: T, cost: CostSummary) => void | Promise<void>;
}): Promise<GuardedResult> {
  const tracker = createCostTracker({ limitUsd: opts.limitUsd });
  try {
    const result = await opts.run(tracker.sink, tracker);
    await opts.write(result, tracker.summary());
    return { status: "ok", ...tracker.summary() };
  } catch (err) {
    if (err instanceof CostLimitExceeded) return { status: "cost_limit", ...tracker.summary() };
    throw err;
  }
}
