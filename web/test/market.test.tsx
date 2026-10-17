import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema } from "pipeline/schema";
import { RadarMarket } from "../components/RadarMarket";
import { isStale, formatUsd, formatVelocity } from "../lib/format";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const fresh = new Date(new Date(radar.generatedAt).getTime() + 2 * 3600_000);
const old = new Date(new Date(radar.generatedAt).getTime() + 3 * 86400_000);

function render(now: Date) {
  return renderToStaticMarkup(<RadarMarket radar={radar} now={now} />);
}

describe("página principal tipo mercado", () => {
  it("muestra 10 filas con tema, etapa, variación y mini gráfico", () => {
    const html = render(fresh);
    const rows = html.match(/data-testid="topic-row"/g) ?? [];
    expect(rows).toHaveLength(10);
    for (const t of radar.topics) {
      expect(html).toContain(t.label);
      expect(html).toContain(`href="/tema/${t.id}"`);
    }
    expect(html.match(/data-testid="sparkline"/g)).toHaveLength(10);
    expect(html).toContain(formatVelocity(radar.topics[0].velocity));
    expect(html).toMatch(/Pico|Creciendo|Emergente|Saturado/);
  });

  it("muestra la fecha de los datos y el costo de la última corrida", () => {
    const html = render(fresh);
    expect(html).toMatch(/Datos del \d{1,2} de \w+/);
    expect(html).toContain(formatUsd(radar.cost.totalUsd));
  });

  it("muestra el estado de cada fuente", () => {
    const html = render(fresh);
    for (const s of ["Hacker News", "arXiv", "YouTube", "Prensa"]) expect(html).toContain(s);
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
