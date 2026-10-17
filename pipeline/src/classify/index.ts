import type { Classification, NormalizedItem } from "../schema.js";
import { CostLimitExceeded } from "../cost.js";
import { mapPool } from "../pool.js";
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
  concurrency?: number;
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
// ese lote (y cualquier ítem que haya quedado sin respuesta) pasa al respaldo, y el principal
// deja de usarse el resto de la corrida para no repetir el mismo error en cada lote.
export async function classifyWithFallback(
  items: NormalizedItem[],
  opts: ClassifyOptions,
): Promise<Map<string, Classification>> {
  const { primary, fallback, timeoutMs = 60_000, batchSize = 40, concurrency = 1, log = console.warn } = opts;
  const out = new Map<string, Classification>();
  let primaryDown = false;

  const batches: NormalizedItem[][] = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));

  await mapPool(batches, concurrency, async (batch) => {
    let primaryResult = new Map<string, RawClassification>();
    if (!primaryDown) {
      try {
        primaryResult = await withTimeout(primary.classify(batch), timeoutMs, primary.name);
      } catch (err) {
        // Superar el tope de costo detiene la corrida; no se compensa con el respaldo.
        if (err instanceof CostLimitExceeded) throw err;
        if (!primaryDown) log(`Clasificador ${primary.name} falló (${errorMessage(err)}); se usa el respaldo ${fallback.name}`);
        primaryDown = true;
      }
    }
    for (const [id, c] of primaryResult) out.set(id, { ...c, usedFallback: false });

    const missing = batch.filter((it) => !out.has(it.id));
    if (missing.length === 0) return;
    if (primaryResult.size > 0) log(`${missing.length} ítems sin respuesta de ${primary.name}; se usa el respaldo ${fallback.name}`);
    try {
      const fb = await fallback.classify(missing);
      for (const [id, c] of fb) out.set(id, { ...c, usedFallback: true });
    } catch (err) {
      // Un lote sin clasificar no detiene la corrida: esos ítems quedan sin relevancia.
      if (err instanceof CostLimitExceeded) throw err;
      log(`Respaldo ${fallback.name} falló en un lote de ${missing.length} ítems: ${errorMessage(err)}`);
    }
  });
  return out;
}
