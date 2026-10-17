import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema } from "pipeline/schema";
import { Landing } from "../components/Landing";
import { latamDots, radarBlips, highlightTopics } from "../lib/landing";
import { PILARES } from "../lib/pilares";
import { SOURCE_LABEL, formatUsd, formatVelocity } from "../lib/format";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const html = renderToStaticMarkup(<Landing radar={radar} />);

describe("landing", () => {
  it("lleva al radar desde el hero y desde el cierre", () => {
    expect(html).toContain("escalar empresas");
    expect(html.match(/href="\/radar"/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("tiene las secciones a las que enlazan el hero y el encabezado", () => {
    expect(html).toContain('id="como-funciona"');
    expect(html).toContain('href="#como-funciona"');
    expect(html).toContain('id="historia"');
    expect(html).toContain('id="impacto"');
  });

  it("usa la fecha y el costo reales de la corrida", () => {
    expect(html).toMatch(/Datos del \d{1,2} de \w+/);
    expect(html).toContain(formatUsd(radar.cost.totalUsd));
  });

  it("muestra cada fuente con las piezas que trajo en la corrida", () => {
    for (const s of radar.sources) {
      expect(html).toContain(SOURCE_LABEL[s.source]);
      expect(html).toContain(`>${s.items}<`);
    }
  });

  it("destaca el tema que más crece con su variación real", () => {
    const top = highlightTopics(radar.topics)[0];
    expect(html).toContain(top.label);
    expect(html).toContain(formatVelocity(top.velocity));
  });

  it("muestra los 8 pilares y el número real de temas", () => {
    for (const p of PILARES) expect(html).toContain(p);
    expect(html).toContain(`>${radar.topics.length}<`);
  });

  it("enlaza el formulario del sensor sin un formulario falso en la página", () => {
    expect(html).toContain("docs.google.com/forms");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<form");
  });

  it("no usa la raya larga", () => {
    expect(html).not.toContain("—");
  });
});

describe("dibujo del radar", () => {
  it("los puntos del mapa caen dentro del cuadro", () => {
    const dots = latamDots(2.1);
    expect(dots.length).toBeGreaterThan(100);
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(100);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(100);
    }
  });

  it("ubica un punto por tema, más afuera cuanto más temprana la etapa", () => {
    const blips = radarBlips(radar.topics);
    expect(blips).toHaveLength(radar.topics.length);
    const dist = (b: { x: number; y: number }) => Math.hypot(b.x - 50, b.y - 50);
    const em = blips.find((b) => b.stage === "emergente")!;
    const sat = blips.find((b) => b.stage === "saturado")!;
    expect(dist(em)).toBeGreaterThan(dist(sat));
  });

  it("solo late el punto de los temas tempranos que suben", () => {
    const blips = radarBlips(radar.topics);
    blips.forEach((b, i) => {
      const t = radar.topics[i];
      const early = t.stage === "emergente" || t.stage === "creciendo";
      expect(b.hot).toBe(early && (t.velocity ?? 0) > 0);
    });
  });

  it("los destacados son los dos que más suben y el que más cae", () => {
    const h = highlightTopics(radar.topics);
    expect(h).toHaveLength(3);
    const v = radar.topics.map((t) => t.velocity ?? 0);
    expect(h[0].velocity).toBe(Math.max(...v));
    expect(h[2].velocity).toBe(Math.min(...v));
  });
});
