// Aplica fn a cada elemento con un máximo de `limit` tareas a la vez, conservando el orden.
// Si una tarea falla, no se arrancan más y se rechaza con ese error.
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}
