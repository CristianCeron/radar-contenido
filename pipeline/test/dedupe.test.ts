import { describe, it, expect } from "vitest";
import { dedupe, mergeSources, normalizeUrl } from "../src/dedupe.js";
import type { NormalizedItem } from "../src/schema.js";

function item(over: Partial<NormalizedItem>): NormalizedItem {
  return {
    id: over.id ?? Math.random().toString(36),
    source: "hackernews",
    layer: "origen",
    title: "Título",
    url: "https://example.com/a",
    outlet: "Hacker News",
    publishedAt: "2026-10-10T00:00:00.000Z",
    metrics: {},
    ...over,
  };
}

describe("normalización y deduplicación", () => {
  it("normaliza enlaces equivalentes", () => {
    expect(normalizeUrl("https://www.example.com/a/?utm_source=x#top")).toBe(normalizeUrl("http://example.com/a"));
    expect(normalizeUrl("https://example.com/a?id=1")).not.toBe(normalizeUrl("https://example.com/a?id=2"));
  });

  it("dos ítems con el mismo enlace quedan en uno y conservan ambas fuentes", () => {
    const out = dedupe([
      item({ id: "hn:1", url: "https://www.youtube.com/watch?v=abc", title: "Video viral sobre agentes" }),
      item({
        id: "yt:abc",
        source: "youtube",
        layer: "difusion",
        outlet: "Canal X",
        url: "https://youtube.com/watch?v=abc&utm_campaign=y",
        title: "Cómo usar agentes de IA",
        publishedAt: "2026-10-09T00:00:00.000Z",
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].mentions?.map((m) => m.source).sort()).toEqual(["hackernews", "youtube"]);
    // Se conserva el ítem publicado primero.
    expect(out[0].id).toBe("yt:abc");
  });

  it("títulos casi idénticos se reducen a uno", () => {
    const out = dedupe([
      item({ id: "a", url: "https://a.com/1", title: "OpenAI lanza un nuevo modelo para empresas" }),
      item({
        id: "b",
        source: "prensa",
        layer: "audiencia_ejecutiva",
        outlet: "Portafolio",
        url: "https://b.com/2",
        title: "OpenAI lanza un nuevo modelo para empresas.",
      }),
      item({ id: "c", url: "https://c.com/3", title: "Anthropic publica un estudio sobre agentes" }),
    ]);
    expect(out).toHaveLength(2);
    const merged = out.find((i) => i.title.startsWith("OpenAI"))!;
    expect(merged.mentions).toHaveLength(2);
    expect(merged.mentions?.map((m) => m.outlet)).toContain("Portafolio");
  });

  it("títulos parecidos pero distintos no se unen", () => {
    const out = dedupe([
      item({ id: "a", url: "https://a.com/1", title: "Google lanza Gemini 4 para empresas" }),
      item({ id: "b", url: "https://b.com/2", title: "Google retira Gemini 3 del mercado europeo" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("une las cuatro fuentes sin duplicados", () => {
    const out = mergeSources([
      { status: "ok", items: [item({ id: "1", url: "https://x.com/1", title: "Uno sobre IA" })] },
      { status: "ok", items: [item({ id: "1", url: "https://x.com/1", title: "Uno sobre IA" })] },
      { status: "cupo_agotado", items: [] },
      { status: "ok", items: [item({ id: "2", url: "https://x.com/2", title: "Dos sobre modelos" })] },
    ]);
    expect(out).toHaveLength(2);
    const ids = new Set(out.map((i) => normalizeUrl(i.url)));
    expect(ids.size).toBe(out.length);
    for (const i of out) expect(i.mentions?.length).toBeGreaterThanOrEqual(1);
  });
});
