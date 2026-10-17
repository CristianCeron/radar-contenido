import { describe, it, expect } from "vitest";
import { fetchPress, isAboutAI } from "../src/sources/rss.js";
import { NormalizedItemSchema } from "../src/schema.js";
import { fakeFetch, fixture } from "./helpers.js";

const now = new Date("2026-10-17T06:00:00Z");
const feeds = [{ outlet: "Portafolio", url: "https://www.portafolio.co/rss/tecnologia.xml" }];

describe("fuente prensa ejecutiva por RSS", () => {
  it("devuelve notas de IA en la capa audiencia ejecutiva con medio y fecha", async () => {
    const f = fakeFetch(() => ({ body: fixture("rss-portafolio.xml") }));
    const res = await fetchPress({ fetch: f, now, feeds });

    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(2);
    for (const item of res.items) expect(NormalizedItemSchema.safeParse(item).success).toBe(true);
    expect(res.items[0]).toMatchObject({
      source: "prensa",
      layer: "audiencia_ejecutiva",
      outlet: "Portafolio",
      publishedAt: "2026-10-16T20:06:24.000Z",
    });
    expect(res.items[0].url).toMatch(/^https:\/\/www\.portafolio\.co\/tecnologia\//);
    expect(res.items[1].title).toMatch(/inteligencia artificial/);
  });

  it("detecta si una nota habla de IA", () => {
    expect(isAboutAI("Meta presenta nuevos modelos de inteligencia artificial")).toBe(true);
    expect(isAboutAI("Crédito para IA se encarece")).toBe(true);
    expect(isAboutAI("Agentes de AI en la banca")).toBe(true);
    expect(isAboutAI("Netflix despedirá a 1.000 empleados")).toBe(false);
    expect(isAboutAI("La iniciativa del gobierno")).toBe(false);
  });

  it("omite un feed caído sin romper la corrida", async () => {
    const f = fakeFetch((url) =>
      url.includes("caido") ? { status: 500, body: "error" } : { body: fixture("rss-portafolio.xml") },
    );
    const res = await fetchPress({
      fetch: f,
      now,
      feeds: [{ outlet: "Caído", url: "https://caido.example.com/rss" }, ...feeds],
    });
    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(2);
  });

  it("omite un feed con XML roto", async () => {
    const f = fakeFetch((url) =>
      url.includes("roto") ? { body: "<rss><channel><item>" } : { body: fixture("rss-portafolio.xml") },
    );
    const res = await fetchPress({ fetch: f, now, feeds: [{ outlet: "Roto", url: "https://roto.example.com" }, ...feeds] });
    expect(res.items).toHaveLength(2);
  });

  it("si todos los feeds fallan devuelve error sin lanzar", async () => {
    const f = fakeFetch(() => ({ status: 500, body: "error" }));
    const res = await fetchPress({ fetch: f, now, feeds });
    expect(res).toMatchObject({ status: "error", items: [] });
  });

  it("descarta notas de más de 30 días", async () => {
    const f = fakeFetch(() => ({ body: fixture("rss-portafolio.xml") }));
    const res = await fetchPress({ fetch: f, now: new Date("2026-12-31T00:00:00Z"), feeds });
    expect(res.items).toEqual([]);
  });
});
