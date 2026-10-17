import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BriefSkeleton, RadarSkeleton } from "../components/Skeletons";
import { StaleWarning } from "../components/notices";
import NotFound from "../app/not-found";

describe("estados y avisos", () => {
  it("el aviso de datos viejos dice la fecha del último resultado", () => {
    const html = renderToStaticMarkup(<StaleWarning generatedAt="2026-10-17T21:02:44.652Z" />);
    expect(html).toContain('role="status"');
    expect(html).toContain("17 de octubre de 2026");
  });

  it("los esqueletos de carga se anuncian como ocupados", () => {
    expect(renderToStaticMarkup(<RadarSkeleton />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<BriefSkeleton />)).toContain('aria-busy="true"');
  });

  it("un tema que no existe lleva de vuelta al radar", () => {
    expect(renderToStaticMarkup(<NotFound />)).toContain('href="/radar"');
  });
});
