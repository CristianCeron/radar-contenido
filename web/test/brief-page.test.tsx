import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema, type Brief } from "pipeline/schema";
import { BriefView } from "../components/BriefView";
import { applyResponse, briefText, initialShown } from "../lib/brief-state";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const topic = radar.topics[8];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const live: Brief = {
  profileId: "30x",
  angle: "Ángulo en vivo",
  format: "Post de LinkedIn",
  hook: "Gancho en vivo",
  opportunity: { product: "Inmersión Ejecutiva 30X", rationale: "" },
  generatedAt: "2026-10-17T22:00:00.000Z",
};

function render(brand: string, t = topic) {
  return renderToStaticMarkup(<BriefView topic={t} profiles={radar.profiles} initialBrand={brand} />);
}

describe("página del brief", () => {
  it("muestra el brief del radar diario para la marca pedida", () => {
    const b = topic.briefs["andres-bilbao"];
    const html = render("andres-bilbao");
    expect(html).toContain(esc(b.hook));
    expect(html).toContain(esc(b.angle));
    expect(html).toContain(esc(b.format));
    expect(html).toContain(esc(b.opportunity.product));
    expect(html).toContain(esc(b.opportunity.rationale));
    expect(html).toContain("Del radar de la mañana");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Andrés Bilbao/);
  });

  it("muestra de qué tema viene: nombre, pilar y etapa", () => {
    const html = render("30x");
    expect(html).toContain(esc(topic.label));
    if (topic.pilar) expect(html).toContain(topic.pilar);
    expect(html).toContain(`href="/tema/${topic.id}"`);
  });

  it("ofrece copiar y regenerar", () => {
    const html = render("30x");
    expect(html).toContain("Copiar brief");
    expect(html).toContain("Regenerar");
  });

  it("si la marca no existe usa la primera", () => {
    expect(render("otra")).toMatch(/aria-pressed="true"[^>]*>30X/);
  });

  it("sin brief guardado ofrece generarlo en vivo", () => {
    const html = render("30x", { ...topic, briefs: {} });
    expect(html).toContain('data-testid="brief-empty"');
    expect(html).toContain("Generar brief en vivo");
  });
});

describe("estado del brief", () => {
  it("arranca con los briefs del radar diario", () => {
    const s = initialShown(radar.profiles, topic.briefs);
    expect(s["30x"]).toEqual({ brief: topic.briefs["30x"], origin: "corrida" });
  });

  it("un brief en vivo reemplaza al guardado", () => {
    const s = applyResponse({ brief: topic.briefs["30x"], origin: "corrida" }, { source: "en_vivo", brief: live });
    expect(s).toEqual({ brief: live, origin: "en_vivo" });
  });

  it("si el modelo no respondió, queda el precalculado y se marca", () => {
    const saved = topic.briefs["30x"];
    const s = applyResponse({ brief: saved, origin: "corrida" }, { source: "precalculado", brief: saved, notice: "x" });
    expect(s).toEqual({ brief: saved, origin: "precalculado" });
  });

  it("si no hubo respuesta conserva el último y marca la falla", () => {
    const saved = topic.briefs["30x"];
    expect(applyResponse({ brief: saved, origin: "en_vivo" }, null)).toEqual({ brief: saved, origin: "en_vivo", failed: true });
    expect(applyResponse(undefined, { source: "sin_brief", notice: "x" })).toEqual({ origin: "corrida", failed: true });
  });

  it("arma el texto para copiar sin la línea de oportunidad vacía", () => {
    const text = briefText(live, "30X", "Sistemas de ventas B2B");
    expect(text).toContain("Brief para 30X · Sistemas de ventas B2B");
    expect(text).toContain("Gancho: Gancho en vivo");
    expect(text).toContain("Oportunidad: Inmersión Ejecutiva 30X");
    expect(text).not.toMatch(/Inmersión Ejecutiva 30X\. $/m);
  });
});
