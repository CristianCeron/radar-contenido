import { readFileSync } from "node:fs";

export function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

// fetch falso: responde según la URL pedida y registra las llamadas.
export function fakeFetch(
  handler: (url: string) => { status?: number; body: string },
): typeof fetch & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    const { status = 200, body } = handler(url);
    return new Response(body, { status });
  }) as typeof fetch & { calls: string[] };
  fn.calls = calls;
  return fn;
}
