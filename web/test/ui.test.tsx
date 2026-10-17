import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { StageBadge, VelocityBadge, RelevanceBar, SourceChips } from "../components/badges";
import { Sparkline } from "../components/Sparkline";
import { BrandToggle } from "../components/BrandToggle";
import { PILARES } from "../lib/pilares";
import { mentions14 } from "../lib/format";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("etiqueta de etapa", () => {
  it("muestra el nombre de la etapa con su color", () => {
    const out = html(<StageBadge stage="pico" />);
    expect(out).toContain("Pico");
    expect(out).toContain('data-stage="pico"');
    expect(out).toContain("bg-ink");
  });
});

describe("variación semanal", () => {
  it("si sube usa flecha arriba y el color de subida", () => {
    const out = html(<VelocityBadge velocity={116.7} />);
    expect(out).toContain("▲ +117 %");
    expect(out).toContain("bg-up-bg");
  });

  it("si baja usa flecha abajo y el color de bajada", () => {
    const out = html(<VelocityBadge velocity={-20} />);
    expect(out).toContain("▼ −20 %");
    expect(out).toContain("bg-down-bg");
  });

  it("sin dato no inventa una flecha", () => {
    expect(html(<VelocityBadge velocity={null} />)).toContain("sin dato");
    expect(html(<VelocityBadge velocity={null} />)).not.toContain("▲");
  });
});

describe("barra de relevancia", () => {
  it("convierte la relevancia a 0-100 y llena la barra con ese ancho", () => {
    const out = html(<RelevanceBar value={0.78} />);
    expect(out).toContain(">78<");
    expect(out).toContain("width:78%");
  });
});

describe("estado de fuentes", () => {
  const sources = [
    { source: "hackernews", status: "ok", fetchedAt: "2026-10-17T21:00:00Z", items: 426 },
    { source: "youtube", status: "ultimo_guardado", fetchedAt: "2026-10-17T10:00:00Z", items: 254 },
    { source: "arxiv", status: "error", fetchedAt: "2026-10-17T21:00:00Z", items: 0 },
  ] as const;

  it("muestra cada fuente con su conteo y un estado: al día, último guardado o caída", () => {
    const out = html(<SourceChips sources={[...sources]} />);
    expect(out).toContain("Hacker News · 426");
    expect(out).toContain('data-status="ok"');
    expect(out).toMatch(/YouTube · último guardado del 17 de octubre/);
    expect(out).toContain('data-status="ultimo_guardado"');
    expect(out).toContain("arXiv · sin datos hoy");
    expect(out).toContain('data-status="caida"');
  });
});

describe("mini gráfico", () => {
  it("dibuja la serie real con un punto por día", () => {
    const out = html(<Sparkline values={[0, 2, 4, 2]} rising />);
    expect(out).toContain('data-testid="sparkline"');
    expect(out).toContain('points="0.0,33.0 46.7,18.0 93.3,3.0 140.0,18.0"');
    expect(out).toContain("#0a0a0a");
  });

  it("si el tema baja la línea es violeta", () => {
    expect(html(<Sparkline values={[3, 1]} rising={false} />)).toContain("#7b6be6");
  });
});

describe("selector de marca", () => {
  it("marca el perfil activo", () => {
    const out = html(
      <BrandToggle profiles={[{ id: "30x", nombre: "30X" }, { id: "andres-bilbao", nombre: "Andrés Bilbao" }]} value="andres-bilbao" onChange={() => {}} />,
    );
    expect(out).toMatch(/aria-pressed="true"[^>]*>Andrés Bilbao/);
    expect(out).toMatch(/aria-pressed="false"[^>]*>30X/);
  });
});

describe("pilares", () => {
  it("son los mismos 8 pilares del tema que usa el pipeline", () => {
    const tema = JSON.parse(readFileSync(new URL("../../pipeline/config/tema.json", import.meta.url), "utf8"));
    expect(PILARES).toEqual(tema.pilares);
  });
});

describe("menciones de 14 días", () => {
  it("suma los últimos 14 días de la serie", () => {
    const series = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, count: i < 16 ? 100 : 1 }));
    expect(mentions14(series)).toBe(14);
  });
});
