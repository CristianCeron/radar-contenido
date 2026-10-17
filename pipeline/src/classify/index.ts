import type { Classification, NormalizedItem } from "../schema.js";
import { CostLimitExceeded } from "../cost.js";
import { errorMessage } from "../sources/types.js";

export type RawClassification = Omit<Classification, "usedFallback">;

export interface Classifier {
  name: string;
  classify(items: NormalizedItem[]): Promise<Map<string, RawClassification>>;
}

export interface ClassifyOptions {
  primary: Classifier;
  fallback: Classifier;
  timeoutMs?: number;
  batchSize?: number;
  log?: (msg: string) => void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} excedió ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Clasifica por lotes con el clasificador principal. Si un lote falla o tarda demasiado,
// ese lote (y cualquier ítem que haya quedado sin respuesta) pasa al respaldo.
export async function classifyWithFallback(
  items: NormalizedItem[],
  opts: ClassifyOptions,
): Promise<Map<string, Classification>> {
  const { primary, fallback, timeoutMs = 60_000, batchSize = 40, log = console.warn } = opts;
  const out = new Map<string, Classification>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    let primaryResult = new Map<string, RawClassification>();
    try {
      primaryResult = await withTimeout(primary.classify(batch), timeoutMs, primary.name);
    } catch (err) {
      // Superar el tope de costo detiene la corrida; no se compensa con el respaldo.
      if (err instanceof CostLimitExceeded) throw err;
      log(`Clasificador ${primary.name} falló (${errorMessage(err)}); se usa el respaldo ${fallback.name}`);
    }
    for (const [id, c] of primaryResult) out.set(id, { ...c, usedFallback: false });

    const missing = batch.filter((it) => !out.has(it.id));
    if (missing.length === 0) continue;
    if (primaryResult.size > 0) log(`${missing.length} ítems sin respuesta de ${primary.name}; se usa el respaldo ${fallback.name}`);
    const fb = await fallback.classify(missing);
    for (const [id, c] of fb) out.set(id, { ...c, usedFallback: true });
  }
  return out;
}
