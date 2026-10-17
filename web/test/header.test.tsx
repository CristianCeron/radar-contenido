import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderView, navFor } from "../components/SiteHeader";

const noop = () => {};
const render = (path: string, menuOpen = false) =>
  renderToStaticMarkup(<HeaderView path={path} menuOpen={menuOpen} onToggleMenu={noop} onHelp={noop} onNavigate={noop} />);

describe("navegación del encabezado", () => {
  it("en la landing sigue la historia del diseño: el problema, cómo funciona e impacto", () => {
    expect(navFor("/").map((n) => n.label)).toEqual(["El problema", "Cómo funciona", "Impacto"]);
    expect(navFor("/").map((n) => n.href)).toEqual(["#historia", "#como-funciona", "#impacto"]);
  });

  it("en las demás páginas cómo funciona va antes que el radar", () => {
    for (const path of ["/radar", "/tema/x", "/tema/x/brief"]) {
      expect(navFor(path).map((n) => n.label)).toEqual(["Cómo funciona", "El radar"]);
    }
    expect(navFor("/radar")[0].href).toBe("/#como-funciona");
  });

  it("en la landing tiene el botón para ver el radar", () => {
    expect(render("/")).toContain('href="/radar"');
    expect(render("/")).toContain("Ver el radar");
    expect(render("/radar")).not.toContain("Ver el radar");
  });

  it("marca la página actual", () => {
    expect(render("/radar")).toMatch(/aria-current="page"[^>]*>El radar/);
    expect(render("/tema/x")).toMatch(/aria-current="page"[^>]*>El radar/);
  });

  it("en celular tiene un botón de menú que abre la misma navegación", () => {
    const closed = render("/");
    expect(closed).toContain('aria-label="Abrir menú"');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).not.toContain('id="menu-celular"');
    const open = render("/", true);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('id="menu-celular"');
    expect(open.match(/href="#como-funciona"/g)!.length).toBe(2);
  });

  it("siempre deja abrir la bienvenida", () => {
    expect(render("/")).toContain('aria-label="Abrir la bienvenida"');
    expect(render("/tema/x")).toContain('aria-label="Abrir la bienvenida"');
  });
});
