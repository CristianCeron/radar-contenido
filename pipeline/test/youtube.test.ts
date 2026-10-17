import { describe, it, expect } from "vitest";
import { fetchYouTube } from "../src/sources/youtube.js";
import { NormalizedItemSchema } from "../src/schema.js";
import { fakeFetch, fixture } from "./helpers.js";

const now = new Date("2026-10-17T06:00:00Z");

const ok = () =>
  fakeFetch((url) => ({
    body: url.includes("/search?") ? fixture("youtube-search.json") : fixture("youtube-videos.json"),
  }));

describe("fuente YouTube", () => {
  it("normaliza videos en la capa difusión con canal, fecha y vistas", async () => {
    const res = await fetchYouTube({ fetch: ok(), now, apiKey: "test", queries: ["agentes de IA"] });

    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(2);
    for (const item of res.items) expect(NormalizedItemSchema.safeParse(item).success).toBe(true);
    expect(res.items[0]).toMatchObject({
      id: "yt:vid00000001",
      source: "youtube",
      layer: "difusion",
      outlet: "Canal IA Negocios",
      url: "https://www.youtube.com/watch?v=vid00000001",
      publishedAt: "2026-10-14T15:00:12.000Z",
      metrics: { views: 48210, comments: 312 },
    });
    expect(res.items[1].metrics.views).toBe(1203450);
  });

  it("busca por tema y por fecha de publicación de los últimos 30 días", async () => {
    const f = ok();
    await fetchYouTube({ fetch: f, now, apiKey: "test", queries: ["agentes de IA"] });
    const search = decodeURIComponent(f.calls[0]);
    expect(search).toContain("q=agentes de IA".replace(/ /g, "+"));
    expect(search).toContain("publishedAfter=2026-09-17T06:00:00");
    expect(search).toContain("type=video");
    expect(f.calls[1]).toContain("/videos?");
    expect(decodeURIComponent(f.calls[1])).toContain("id=vid00000001,vid00000002");
  });

  it("ante cupo agotado devuelve el estado sin lanzar excepción", async () => {
    const f = fakeFetch(() => ({ status: 403, body: fixture("youtube-quota.json") }));
    const res = await fetchYouTube({ fetch: f, now, apiKey: "test", queries: ["agentes de IA"] });
    expect(res.status).toBe("cupo_agotado");
    expect(res.items).toEqual([]);
  });

  it("conserva lo ya leído si el cupo se agota a mitad de la corrida", async () => {
    let n = 0;
    const f = fakeFetch((url) => {
      if (url.includes("/search?")) {
        n++;
        return n === 1 ? { body: fixture("youtube-search.json") } : { status: 403, body: fixture("youtube-quota.json") };
      }
      return { body: fixture("youtube-videos.json") };
    });
    const res = await fetchYouTube({ fetch: f, now, apiKey: "test", queries: ["a", "b"] });
    expect(res.status).toBe("cupo_agotado");
    expect(res.items).toHaveLength(2);
  });

  it("sin clave devuelve error sin llamar a la API", async () => {
    const f = ok();
    const res = await fetchYouTube({ fetch: f, now, apiKey: "", queries: ["x"] });
    expect(res.status).toBe("error");
    expect(f.calls).toHaveLength(0);
  });
});
