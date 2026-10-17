import { describe, it, expect } from "vitest";

describe("humo web", () => {
  it("expone la página raíz", async () => {
    const mod = await import("../app/page");
    expect(typeof mod.default).toBe("function");
  });

  it("la raíz es la landing con el radar.json publicado y lleva a /radar", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const mod = await import("../app/page");
    const html = renderToStaticMarkup(mod.default());
    expect(html).toContain('id="como-funciona"');
    expect(html).toContain('href="/radar"');
  });
});
