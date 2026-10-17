import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarSchema, type Topic } from "pipeline/schema";
import { TopicDetail } from "../components/TopicDetail";
import { AreaChart, areaPaths } from "../components/AreaChart";
import { mentions14, splitSerif } from "../lib/format";

const radar = RadarSchema.parse(JSON.parse(readFileSync(new URL("./fixtures/radar-real.json", import.meta.url), "utf8")));
const topic = radar.topics[0];
const render = (t: Topic) => renderToStaticMarkup(<TopicDetail topic={t} radar={radar} />);
const html = render(topic);
const esc = (s: string) => s.replace(/&/g, "&amp;");

describe("detalle de tema", () => {
  it("muestra posición, nombre, pilar, etapa y su explicación", () => {
    expect(html).toContain(`#${radar.topics.indexOf(topic) + 1}`);
    const [a, w, b] = splitSerif(topic.label);
    expect(html).toContain(`${a}<span class="serif text-accent">${w}</span>${b}`);
    if (topic.pilar) expect(html).toContain(topic.pilar);
    expect(html).toContain(`data-stage="${topic.stage}"`);
    expect(html).toContain('data-testid="stage-hint"');
  });

  it("muestra semana, menciones de 14 días y relevancia", () => {
    expect(html).toContain("Menciones 14 d");
    expect(html).toContain(`>${mentions14(topic.series)}<`);
    expect(html).toContain(`>${Math.round(topic.executiveRelevance * 100)}<`);
  });

  it("dibuja el gráfico de 30 días con la serie real", () => {
    expect(html).toContain('data-testid="growth-chart"');
    expect(html).toContain(areaPaths(topic.series.map((p) => p.count)).line);
  });

  it("muestra quiénes hablan del tema: canales y medios", () => {
    expect(html).toContain('data-testid="channels"');
    for (const c of topic.channels.filter((c) => c.source !== "equipo").slice(0, 3)) expect(html).toContain(esc(c.name));
  });

  it("muestra cómo lo hacen: gancho y formato de las piezas principales", () => {
    expect(html).toContain('data-testid="pieces"');
    for (const p of topic.topPieces) expect(html).toContain(esc(p.format));
    expect(html).toContain("Gancho: ");
  });

  it("muestra el porqué con enlaces válidos a la evidencia", () => {
    expect(html).toContain('data-testid="why"');
    for (const e of topic.explanation.evidence) {
      expect(e.url).toMatch(/^https?:\/\//);
      expect(html).toContain(`href="${esc(e.url)}"`);
    }
    expect(html).toMatch(/target="_blank" rel="noopener noreferrer"/);
  });

  it("da acceso al brief de la marca elegida", () => {
    expect(html).toContain('data-testid="briefs"');
    expect(html).toContain(`href="/tema/${topic.id}/brief?marca=30x"`);
    expect(html).toContain(esc(topic.briefs["30x"].hook));
    for (const p of radar.profiles) expect(html).toContain(p.nombre);
  });
});

describe("aportes del equipo", () => {
  const conEquipo = radar.topics.find((t) => t.channels.some((c) => c.source === "equipo"));

  it("suma los aportes del equipo sin mostrar nombre ni enlace", () => {
    expect(conEquipo).toBeDefined();
    const out = render(conEquipo!);
    const total = conEquipo!.channels.filter((c) => c.source === "equipo").reduce((s, c) => s + c.count, 0);
    expect(out).toContain('data-testid="team-chip"');
    expect(out).toMatch(new RegExp(`Aportes del equipo</span><span[^>]*>${total}<`));
    for (const c of conEquipo!.channels.filter((c) => c.source === "equipo")) expect(out).not.toContain(esc(c.name));
  });

  it("si no hay aportes no muestra el chip", () => {
    const sin = { ...topic, channels: topic.channels.filter((c) => c.source !== "equipo") };
    expect(render(sin)).not.toContain('data-testid="team-chip"');
  });
});

describe("gráfico de área", () => {
  it("escala la serie entre la línea base y el máximo", () => {
    const { line } = areaPaths([0, 4, 2]);
    expect(line).toBe("M0.0,220.0 L580.0,20.0 L1160.0,120.0");
  });

  it("rotula las fechas reales de la serie", () => {
    const series = Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, count: i }));
    series[29].date = "2026-10-17";
    const out = renderToStaticMarkup(<AreaChart series={series} />);
    expect(out).toContain("1 de septiembre");
    expect(out).toContain("17 de octubre");
  });
});

describe("palabra destacada del título", () => {
  it("toma la última palabra de al menos 5 letras", () => {
    expect(splitSerif("Sistemas de ventas B2B")).toEqual(["Sistemas de ", "ventas", " B2B"]);
    expect(splitSerif("Expansión a Europa")).toEqual(["Expansión a ", "Europa", ""]);
    expect(splitSerif("IA")).toEqual(["", "IA", ""]);
  });
});
