import { describe, it, expect } from "vitest";
import { fetchSensor, parseCsv } from "../src/sources/sensor.js";
import { NormalizedItemSchema } from "../src/schema.js";
import { layerCounts } from "../src/stage.js";
import { fakeFetch, fixture } from "./helpers.js";

const now = new Date("2026-10-17T17:00:00Z");
const url = "https://docs.google.com/spreadsheets/d/e/x/pub?output=csv";

describe("lector de CSV", () => {
  it("respeta comillas, comas internas y saltos de línea de Windows", () => {
    expect(parseCsv('a,b\r\n1,"x, y"\r\n2,"dice ""hola"""\r\n')).toEqual([
      ["a", "b"],
      ["1", "x, y"],
      ["2", 'dice "hola"'],
    ]);
  });
});

// Responde la hoja y, para los enlaces sin descripción, el oEmbed oficial de TikTok.
function sheetAndOembed() {
  return fakeFetch((u) => {
    if (u.startsWith("https://www.tiktok.com/oembed")) {
      return { body: JSON.stringify({ title: "Tres usos de IA para pymes #ia", author_name: "otro" }) };
    }
    return { body: fixture("sensor-respuestas.csv") };
  });
}

describe("sensor humano", () => {
  it("convierte las respuestas del formulario en menciones de la fuente equipo", async () => {
    const f = sheetAndOembed();
    const res = await fetchSensor({ fetch: f, now, url });

    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(5);
    for (const item of res.items) expect(NormalizedItemSchema.safeParse(item).success).toBe(true);

    const li = res.items.find((i) => i.outlet.startsWith("LinkedIn"))!;
    expect(li).toMatchObject({
      source: "equipo",
      layer: "audiencia_ejecutiva",
      title: "Gerente cuenta cómo usa agentes de IA para cerrar ventas",
      outlet: "LinkedIn, aportes del equipo",
      publishedAt: "2026-10-15T14:12:44.000Z",
    });
    expect(res.items.find((i) => i.outlet.startsWith("Instagram"))!.layer).toBe("difusion");
  });

  it("con solo el enlace de LinkedIn, toma el tema de las palabras del enlace sin el usuario", async () => {
    const res = await fetchSensor({ fetch: sheetAndOembed(), now, url });
    const li = res.items.find((i) => i.title.toLowerCase().includes("europa"))!;
    expect(li.title).toBe("regulacion ia europa empresas");
    expect(li.title).not.toContain("juan");
    expect(li.layer).toBe("audiencia_ejecutiva");
  });

  it("con solo el enlace de TikTok, usa el título del oEmbed oficial y no el autor", async () => {
    const f = sheetAndOembed();
    const res = await fetchSensor({ fetch: f, now, url });
    const tt = res.items.find((i) => i.title.startsWith("Tres usos de IA"))!;
    expect(tt).toMatchObject({ outlet: "TikTok, aportes del equipo", layer: "difusion" });
    expect(JSON.stringify(res.items)).not.toContain('"otro"');
    expect(f.calls.some((c) => c.startsWith("https://www.tiktok.com/oembed?url="))).toBe(true);
  });

  it("si el oEmbed falla, el reporte sin descripción se omite sin romper la lectura", async () => {
    const f = fakeFetch((u) => (u.includes("oembed") ? { status: 500, body: "" } : { body: fixture("sensor-respuestas.csv") }));
    const res = await fetchSensor({ fetch: f, now, url });
    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(4);
  });

  it("deduce la plataforma por el enlace si la fila no la trae", async () => {
    const f = sheetAndOembed();
    const res = await fetchSensor({ fetch: f, now, url });
    const tiktok = res.items.find((i) => i.title.startsWith("Video sobre regulación"))!;
    expect(tiktok).toMatchObject({ outlet: "TikTok, aportes del equipo", layer: "difusion" });
  });

  it("omite filas repetidas, sin enlace, sin descripción o de más de 30 días", async () => {
    const f = sheetAndOembed();
    const res = await fetchSensor({ fetch: f, now, url });
    const titles = res.items.map((i) => i.title);
    expect(titles).not.toContain("Repetido del primero");
    expect(titles).not.toContain("Publicación de hace más de 30 días");
    expect(titles).not.toContain("Fila sin enlace");
    expect(res.items.some((i) => i.outlet.startsWith("Facebook"))).toBe(false);
  });

  it("las menciones del equipo cuentan en la capa de su plataforma", async () => {
    const f = sheetAndOembed();
    const res = await fetchSensor({ fetch: f, now, url });
    expect(layerCounts(res.items)).toEqual({ origen: 0, difusion: 3, audiencia_ejecutiva: 2 });
  });

  it("si la hoja no responde devuelve error sin lanzar", async () => {
    const f = fakeFetch(() => ({ status: 500, body: "error" }));
    expect(await fetchSensor({ fetch: f, now, url })).toMatchObject({ status: "error", items: [] });
  });

  it("si no hay hoja configurada no llama a nada", async () => {
    const f = fakeFetch(() => ({ body: "" }));
    const res = await fetchSensor({ fetch: f, now, url: "" });
    expect(res.status).toBe("error");
    expect(f.calls).toHaveLength(0);
  });
});
