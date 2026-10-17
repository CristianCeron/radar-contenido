import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema } from "pipeline/schema";
import { TopicDetail } from "../components/TopicDetail";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const topic = radar.topics[0];
const html = renderToStaticMarkup(<TopicDetail topic={topic} radar={radar} />);

describe("detalle de tema", () => {
  it("muestra el nombre, la etapa y el gráfico de 30 días", () => {
    expect(html).toContain(topic.label);
    expect(html).toContain('data-testid="growth-chart"');
    expect(html).toContain(`${topic.series.reduce((s, p) => s + p.count, 0)} menciones en 30 días`);
  });

  it("muestra quiénes hablan del tema: canales y medios", () => {
    expect(html).toContain('data-testid="channels"');
    for (const c of topic.channels.slice(0, 3)) expect(html).toContain(c.name.replace(/&/g, "&amp;"));
  });

  it("muestra cómo lo hacen: gancho y formato de las piezas principales", () => {
    expect(html).toContain('data-testid="pieces"');
    for (const p of topic.topPieces) expect(html).toContain(p.format.replace(/&/g, "&amp;"));
  });

  it("muestra el porqué con enlaces válidos a la evidencia", () => {
    expect(html).toContain('data-testid="why"');
    for (const e of topic.explanation.evidence) {
      expect(e.url).toMatch(/^https?:\/\//);
      expect(html).toContain(`href="${e.url.replace(/&/g, "&amp;")}"`);
    }
    expect(html).toMatch(/target="_blank" rel="noopener noreferrer"/);
  });

  it("muestra los briefs precalculados de cada perfil", () => {
    expect(html).toContain('data-testid="briefs"');
    for (const p of radar.profiles) expect(html).toContain(p.nombre);
  });
});
