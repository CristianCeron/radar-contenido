import { describe, it, expect } from "vitest";
import { fetchHackerNews } from "../src/sources/hn.js";
import { NormalizedItemSchema } from "../src/schema.js";
import { fakeFetch, fixture } from "./helpers.js";

const now = new Date("2026-10-17T06:00:00Z");

describe("fuente Hacker News", () => {
  it("normaliza la respuesta de Algolia en la capa origen", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-search.json") }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });

    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(4);
    for (const item of res.items) expect(NormalizedItemSchema.safeParse(item).success).toBe(true);

    const first = res.items[0];
    expect(first.source).toBe("hackernews");
    expect(first.layer).toBe("origen");
    expect(first.title).toBe("Show HN: AI agent follows instructions you never approved");
    expect(first.url).toMatch(/^https:\/\/github\.com\//);
    expect(first.publishedAt).toBe("2026-10-17T03:33:00.000Z");
    expect(first.metrics).toMatchObject({ points: 1, comments: 0 });
  });

  it("usa el hilo de HN como enlace cuando la historia no tiene url", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-search.json") }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });
    const ask = res.items.find((i) => i.title.startsWith("Ask HN"))!;
    expect(ask.url).toBe("https://news.ycombinator.com/item?id=50000001");
    expect(ask.metrics).toMatchObject({ points: 88, comments: 42 });
  });

  it("no guarda el usuario que publicó (dato personal)", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-search.json") }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });
    expect(JSON.stringify(res.items)).not.toContain("paraphern");
  });

  it("pide solo los últimos 30 días", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-empty.json") }));
    await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });
    const since = Math.floor(now.getTime() / 1000) - 30 * 86400;
    expect(decodeURIComponent(f.calls[0])).toContain(`created_at_i>${since}`);
    expect(f.calls[0]).toContain("search_by_date");
  });

  it("una respuesta vacía devuelve lista vacía", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-empty.json") }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });
    expect(res).toMatchObject({ status: "ok", items: [] });
  });

  it("varias consultas no repiten la misma historia", async () => {
    const f = fakeFetch(() => ({ body: fixture("hn-search.json") }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents", "LLM"] });
    expect(res.items).toHaveLength(4);
  });

  it("un error HTTP devuelve estado error sin lanzar", async () => {
    const f = fakeFetch(() => ({ status: 503, body: "caído" }));
    const res = await fetchHackerNews({ fetch: f, now, queries: ["AI agents"] });
    expect(res.status).toBe("error");
    expect(res.items).toEqual([]);
  });
});
