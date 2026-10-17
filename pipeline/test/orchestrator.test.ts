import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRadar, type RadarDeps } from "../src/orchestrator.js";
import { RadarSchema } from "../src/schema.js";
import { fetchHackerNews } from "../src/sources/hn.js";
import { fetchArxiv } from "../src/sources/arxiv.js";
import { fetchYouTube } from "../src/sources/youtube.js";
import { fetchPress } from "../src/sources/rss.js";
import { createLLMClassifier } from "../src/classify/fallback.js";
import { loadProfiles } from "../src/brief.js";
import type { JsonRequest } from "../src/llm/types.js";
import { fakeFetch, fixture } from "./helpers.js";
import { fakeLLM } from "./fake-llm.js";

const now = new Date("2026-10-17T06:00:00Z");

function ids(prompt: string): string[] {
  return [...prompt.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]);
}
function refs(prompt: string): string[] {
  return [...prompt.matchAll(/"ref":"(e\d+)"/g)].map((m) => m[1]);
}

// Modelo falso que responde cada tipo de pedido del pipeline de forma coherente.
function pipelineLLM(onCall?: (req: JsonRequest<unknown>) => void) {
  return fakeLLM((req) => {
    onCall?.(req);
    if (req.label === "clasificacion-respaldo") {
      return { items: ids(req.prompt).map((id) => ({ id, executiveRelevance: 0.8, kind: "practico", hook: "noticia" })) };
    }
    if (req.label === "temas-etiquetado") {
      const lines = req.prompt.split("\n").filter((l) => l.startsWith("{"));
      return {
        items: lines.map((l) => {
          const { id, titulo } = JSON.parse(l);
          return { id, topic: /agent/i.test(titulo) ? "Agentes de IA" : "Modelos de IA" };
        }),
      };
    }
    if (req.label === "temas-fusion") return { merges: [] };
    if (req.label === "explicacion") {
      const r = refs(req.prompt);
      return { text: "Crece porque aparece en varias fuentes a la vez.", evidenceIds: r.slice(0, 2), pieces: [{ id: r[0], format: "hilo", analysis: "Pregunta directa." }] };
    }
    if (req.label.startsWith("brief-")) {
      const formats = req.prompt.match(/Formatos de la marca: (.+)/)![1].split(" | ");
      const product = req.prompt.match(/- (.+?): /)![1];
      return { angle: "Ángulo", format: formats[0], hook: "Gancho", opportunity: { product, rationale: "Lleva al programa." } };
    }
    throw new Error(`pedido inesperado ${req.label}`);
  });
}

function deps(dir: string, over: Partial<RadarDeps> = {}): RadarDeps {
  const llm = pipelineLLM();
  const f = fakeFetch((url) => {
    if (url.includes("algolia")) return { body: fixture("hn-search.json") };
    if (url.includes("arxiv")) return { body: fixture("arxiv-query.xml") };
    if (url.includes("/search?")) return { body: fixture("youtube-search.json") };
    if (url.includes("/videos?")) return { body: fixture("youtube-videos.json") };
    return { body: fixture("rss-portafolio.xml") };
  });
  return {
    now,
    sources: {
      hackernews: () => fetchHackerNews({ fetch: f, now, queries: ["AI agents"] }),
      arxiv: () => fetchArxiv({ fetch: f, now }),
      youtube: () => fetchYouTube({ fetch: f, now, apiKey: "k", queries: ["agentes"] }),
      prensa: () => fetchPress({ fetch: f, now, feeds: [{ outlet: "Portafolio", url: "https://www.portafolio.co/rss" }] }),
    },
    cacheDir: join(dir, "cache"),
    outputPath: join(dir, "radar.json"),
    makeLLMs: () => ({ fast: llm, writer: llm }),
    makeClassifiers: (fast) => ({ primary: createLLMClassifier(fast), fallback: createLLMClassifier(fast) }),
    profiles: loadProfiles(),
    limitUsd: 1,
    log: () => {},
    ...over,
  };
}

describe("orquestador", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "radar-"));
  });

  it("con fixtures de todas las fuentes escribe un radar.json válido con fecha y costo", async () => {
    const res = await runRadar(deps(dir));
    expect(res.status).toBe("ok");

    const radar = RadarSchema.parse(JSON.parse(readFileSync(join(dir, "radar.json"), "utf8")));
    expect(radar.generatedAt).toBe(now.toISOString());
    expect(radar.cost).toMatchObject({ limitUsd: 1 });
    expect(radar.topics.length).toBeGreaterThan(0);
    expect(radar.sources.map((s) => s.status)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(radar.profiles.map((p) => p.id).sort()).toEqual(["30x", "andres-bilbao"]);
    for (const t of radar.topics) {
      expect(t.series).toHaveLength(30);
      expect(t.explanation.evidence.length).toBeGreaterThan(0);
      expect(Object.keys(t.briefs).sort()).toEqual(["30x", "andres-bilbao"]);
    }
  });

  it("si una fuente falla usa el último resultado guardado y lo indica con su fecha", async () => {
    await runRadar(deps(dir));
    const cached = JSON.parse(readFileSync(join(dir, "cache", "youtube.json"), "utf8"));
    cached.fetchedAt = "2026-10-15T06:00:00.000Z";
    writeFileSync(join(dir, "cache", "youtube.json"), JSON.stringify(cached));

    const res = await runRadar(
      deps(dir, {
        sources: {
          ...deps(dir).sources,
          youtube: async () => ({ status: "cupo_agotado", items: [] }),
        },
      }),
    );
    expect(res.status).toBe("ok");
    const radar = RadarSchema.parse(JSON.parse(readFileSync(join(dir, "radar.json"), "utf8")));
    const yt = radar.sources.find((s) => s.source === "youtube")!;
    expect(yt).toMatchObject({ status: "ultimo_guardado", fetchedAt: "2026-10-15T06:00:00.000Z", items: 2 });
  });

  it("una fuente sin resultado guardado queda marcada sin romper la corrida", async () => {
    const res = await runRadar(
      deps(dir, { sources: { ...deps(dir).sources, arxiv: async () => ({ status: "error", items: [], error: "caído" }) } }),
    );
    expect(res.status).toBe("ok");
    const radar = RadarSchema.parse(JSON.parse(readFileSync(join(dir, "radar.json"), "utf8")));
    expect(radar.sources.find((s) => s.source === "arxiv")).toMatchObject({ status: "error", items: 0 });
  });

  it("si supera el tope de costo conserva el radar.json anterior", async () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "radar.json"), '{"anterior":true}');
    const llm = pipelineLLM();
    const costly = { ...llm, json: async <T,>(req: JsonRequest<T>) => llm.json(req) };
    const res = await runRadar(
      deps(dir, {
        makeLLMs: (sink) => {
          const wrap = { ...costly, json: async <T,>(req: JsonRequest<T>) => { sink({ label: req.label, model: "m", usd: 0.4 }); return costly.json(req); } };
          return { fast: wrap, writer: wrap };
        },
      }),
    );
    expect(res.status).toBe("cost_limit");
    expect(readFileSync(join(dir, "radar.json"), "utf8")).toBe('{"anterior":true}');
  });

  it("guarda en caché el resultado de cada fuente que funcionó", async () => {
    await runRadar(deps(dir));
    for (const s of ["hackernews", "arxiv", "youtube", "prensa"]) expect(existsSync(join(dir, "cache", `${s}.json`))).toBe(true);
  });
});
