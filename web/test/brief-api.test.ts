import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { RadarSchema, type Brief } from "pipeline/schema";
import { handleBriefRequest, type BriefDeps } from "../lib/brief-api";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const topic = radar.topics[0];

const liveBrief: Brief = {
  profileId: "30x",
  angle: "Ángulo nuevo en vivo",
  format: "carrusel de Instagram",
  hook: "Gancho en vivo",
  opportunity: { product: "AI for Executives", rationale: "Razón" },
  generatedAt: "2026-10-17T18:00:00.000Z",
};

function deps(over: Partial<BriefDeps> = {}): BriefDeps {
  return { radar, generate: async () => liveBrief, timeoutMs: 200, ...over };
}

describe("API de brief en vivo", () => {
  it("devuelve el brief generado en vivo para el tema y perfil pedidos", async () => {
    const res = await handleBriefRequest({ topicId: topic.id, profileId: "30x" }, deps());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "en_vivo", brief: { angle: "Ángulo nuevo en vivo" } });
  });

  it("si el modelo falla devuelve el brief precalculado y lo indica", async () => {
    const res = await handleBriefRequest(
      { topicId: topic.id, profileId: "30x" },
      deps({ generate: async () => Promise.reject(new Error("sin cupo")) }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "precalculado", brief: topic.briefs["30x"] });
    expect(res.body.notice).toMatch(/no respondió/);
  });

  it("si el modelo tarda más de lo permitido devuelve el precalculado", async () => {
    const res = await handleBriefRequest(
      { topicId: topic.id, profileId: "andres-bilbao" },
      deps({ generate: () => new Promise(() => {}), timeoutMs: 20 }),
    );
    expect(res.body).toMatchObject({ source: "precalculado", brief: topic.briefs["andres-bilbao"] });
  });

  it("si no hay brief en vivo ni precalculado responde con un mensaje claro", async () => {
    const sinBriefs = { ...radar, topics: radar.topics.map((t) => ({ ...t, briefs: {} })) };
    const res = await handleBriefRequest(
      { topicId: topic.id, profileId: "30x" },
      deps({ radar: sinBriefs, generate: async () => Promise.reject(new Error("caído")) }),
    );
    expect(res.status).toBe(503);
    expect(res.body.source).toBe("sin_brief");
    expect(res.body.notice).toMatch(/No pudimos generar/);
  });

  it("rechaza un tema o perfil que no existe", async () => {
    expect((await handleBriefRequest({ topicId: "no-existe", profileId: "30x" }, deps())).status).toBe(404);
    expect((await handleBriefRequest({ topicId: topic.id, profileId: "otro" }, deps())).status).toBe(404);
    expect((await handleBriefRequest({}, deps())).status).toBe(400);
  });
});
