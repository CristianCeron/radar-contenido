import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema } from "pipeline/schema";
import { Landing } from "../components/Landing";
import { calloutPosition, latamDots, radarBlips, highlightTopics } from "../lib/landing";
import { PILARES } from "../lib/pilares";
import { SOURCE_LABEL, formatUpdated, formatUsd, formatVelocity } from "../lib/format";

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
    expect(html).toContain(`Actualizado el ${formatUpdated(radar.generatedAt)}`);
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

  it("el formulario del sensor abre Google Forms con el enlace y la descripción ya puestos", () => {
    expect(html).toMatch(/<form[^>]*action="https:\/\/docs\.google\.com\/forms\/d\/e\/[^"]+\/viewform"/);
    expect(html).toMatch(/<form[^>]*method="get"/);
    expect(html).toMatch(/<form[^>]*target="_blank"/);
    const link = html.match(/<input[^>]*name="entry\.862709636"[^>]*>/)?.[0] ?? "";
    expect(link).toContain('type="url"');
    expect(link).toContain("required");
    expect(html).toMatch(/<input[^>]*name="entry\.489513849"/);
    expect(html).toContain('name="usp" value="pp_url"');
    expect(html).toContain('for="sensor-link"');
  });

  it("no usa la raya larga", () => {
    expect(html).not.toContain(String.fromCharCode(0x2014));
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

  it("la etiqueta del tema destacado queda debajo de su punto y crece hacia afuera, lejos del eje", () => {
    const right = calloutPosition({ x: 70.9, y: 10.6 });
    expect(right.left).toBeCloseTo(70.9 - 2, 1);
    expect(right.top).toBeCloseTo(10.6 + 2, 1);
    expect(right.right).toBeUndefined();
    const left = calloutPosition({ x: 20, y: 60 });
    expect(left.right).toBeCloseTo(100 - 20 - 2, 1);
    expect(left.left).toBeUndefined();
  });

  it("los destacados son los dos que más suben y el que más cae", () => {
    const h = highlightTopics(radar.topics);
    expect(h).toHaveLength(3);
    const v = radar.topics.map((t) => t.velocity ?? 0);
    expect(h[0].velocity).toBe(Math.max(...v));
    expect(h[2].velocity).toBe(Math.min(...v));
  });
});
