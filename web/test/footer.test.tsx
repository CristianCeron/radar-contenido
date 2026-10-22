import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "../components/SiteFooter";

const html = renderToStaticMarkup(<SiteFooter />);

describe("pie de página", () => {
  it("firma el proyecto con la frase de Cristian", () => {
    expect(html).toContain("Construido por Cristian Cerón");
    expect(html).toContain("visión, empatía y propósito");
    expect(html).toContain("evidencia antes de opinar");
  });

  it("invita a conectar en LinkedIn en una pestaña nueva", () => {
    const a = html.match(/<a[^>]*href="https:\/\/www\.linkedin\.com\/in\/cristianceronb\/"[^>]*>/)?.[0] ?? "";
    expect(a).toContain('target="_blank"');
    expect(a).toContain("noopener");
    expect(html).toContain("Conectemos en LinkedIn");
  });

  it("explica con honestidad por qué el brief en vivo puede tardar", () => {
    expect(html).toContain("Gemini");
    expect(html).toContain("créditos de prueba de Google Cloud");
    expect(html).toContain("15 segundos");
    expect(html).toContain("brief de la mañana");
  });

  it("no muestra los enlaces a la metodología, el repositorio ni el formulario del sensor", () => {
    expect(html).not.toContain("Metodología");
    expect(html).not.toContain("Repositorio");
    expect(html).not.toContain("Formulario del sensor");
    expect(html).not.toContain("spec-radar-contenido.md");
  });

  it("no usa la raya larga", () => {
    expect(html).not.toContain(String.fromCharCode(0x2014));
  });
});
