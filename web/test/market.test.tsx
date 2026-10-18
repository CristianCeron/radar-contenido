import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema } from "pipeline/schema";
import { RadarMarket } from "../components/RadarMarket";
import { isStale, formatUpdated, formatUsd, formatVelocity, mentions14 } from "../lib/format";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const fresh = new Date(new Date(radar.generatedAt).getTime() + 2 * 3600_000);
const old = new Date(new Date(radar.generatedAt).getTime() + 3 * 86400_000);

function render(now: Date, initialPilar?: string) {
  return renderToStaticMarkup(<RadarMarket radar={radar} now={now} initialPilar={initialPilar} />);
}

describe("página del radar", () => {
  it("muestra 10 filas con tema, etapa, variación y mini gráfico", () => {
    const html = render(fresh);
    expect(html.match(/data-testid="topic-row"/g)).toHaveLength(10);
    for (const t of radar.topics) {
      expect(html).toContain(t.label);
      expect(html).toContain(`href="/tema/${t.id}"`);
    }
    expect(html.match(/data-testid="sparkline"/g)).toHaveLength(10);
    expect(html).toContain(formatVelocity(radar.topics[0].velocity));
    expect(html).toMatch(/Pico|Creciendo|Emergente|Saturado/);
  });

  it("muestra las menciones de 14 días de cada tema", () => {
    const html = render(fresh);
    const t = radar.topics[4];
    expect(html).toContain(`${mentions14(t.series)} menciones en 14 días`);
  });

  it("cada columna dice qué mide, sin abreviaturas", () => {
    const html = render(fresh);
    for (const [titulo, detalle] of [
      ["Semana", "frente a la anterior"],
      ["30 días", "menciones por día"],
      ["Menciones", "últimos 14 días"],
      ["Relevancia", "para founders, 0 a 100"],
    ]) {
      expect(html).toMatch(new RegExp(`>${titulo}<[^]*?>${detalle}<`));
    }
    expect(html).not.toContain("14 d<");
  });

  it("muestra la fecha y hora de la última actualización y el costo de la corrida", () => {
    const html = render(fresh);
    expect(html).toContain(`Actualizado el ${formatUpdated(radar.generatedAt)}`);
    expect(html).toContain(formatUsd(radar.cost.totalUsd));
  });

  it("muestra el estado de cada fuente", () => {
    const html = render(fresh);
    for (const s of ["Hacker News", "arXiv", "YouTube", "Prensa"]) expect(html).toContain(s);
  });

  it("ofrece un filtro por cada pilar de la Inmersión, con Todos activo", () => {
    const html = render(fresh);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Todos</);
    for (const p of ["Liderazgo y mentalidad", "Growth", "Fundraising", "IA aplicada al negocio"]) expect(html).toContain(`>${p}<`);
  });

  it("si un pilar no tiene temas muestra el estado vacío", () => {
    const html = render(fresh, "Fundraising");
    expect(html).not.toContain('data-testid="topic-row"');
    expect(html).toContain("Ningún tema de Fundraising entró al top 10 esta semana.");
    expect(html).toContain("Ver todos los temas");
  });

  it("filtra por pilar", () => {
    const html = render(fresh, "Growth");
    const growth = radar.topics.filter((t) => t.pilar === "Growth");
    expect(html.match(/data-testid="topic-row"/g)).toHaveLength(growth.length);
  });

  it("sin datos antiguos no muestra el aviso", () => {
    expect(render(fresh)).not.toContain('data-testid="stale-warning"');
  });

  it("con datos antiguos muestra el aviso", () => {
    const html = render(old);
    expect(html).toContain('data-testid="stale-warning"');
    expect(html).toMatch(/más de un día/);
  });
});

describe("formato", () => {
  it("formatea la variación con signo y sin decimales de más", () => {
    expect(formatVelocity(288.9)).toBe("+289 %");
    expect(formatVelocity(-27.3)).toBe("−27 %");
    expect(formatVelocity(null)).toBe("sin dato");
  });

  it("los datos son antiguos después de 36 horas", () => {
    const t = new Date("2026-10-17T06:00:00Z");
    expect(isStale(t.toISOString(), new Date("2026-10-18T06:00:00Z"))).toBe(false);
    expect(isStale(t.toISOString(), new Date("2026-10-18T19:00:00Z"))).toBe(true);
  });
});

describe("pilar en el radar", () => {
  it("muestra el pilar de cada tema cuando existe", () => {
    const conPilar = { ...radar, topics: radar.topics.map((t, i) => ({ ...t, pilar: i === 0 ? "Ventas" : undefined })) };
    const html = renderToStaticMarkup(<RadarMarket radar={conPilar} now={fresh} />);
    expect(html.match(/data-testid="pilar"/g)).toHaveLength(1);
    expect(html).toContain("Ventas");
  });
});
