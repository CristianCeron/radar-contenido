import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderView, navFor } from "../components/SiteHeader";

const noop = () => {};
const render = (path: string, menuOpen = false) =>
  renderToStaticMarkup(<HeaderView path={path} menuOpen={menuOpen} onToggleMenu={noop} onHelp={noop} onNavigate={noop} />);

describe("navegación del encabezado", () => {
  it("es el mismo menú en todas las páginas: el problema, cómo funciona e impacto", () => {
    for (const path of ["/", "/radar", "/tema/x", "/tema/x/brief"]) {
      expect(navFor(path).map((n) => n.label)).toEqual(["El problema", "Cómo funciona", "Impacto"]);
    }
  });

  it("en la landing baja a la sección; desde otra página vuelve a la landing en esa sección", () => {
    expect(navFor("/").map((n) => n.href)).toEqual(["#historia", "#como-funciona", "#impacto"]);
    expect(navFor("/radar").map((n) => n.href)).toEqual(["/#historia", "/#como-funciona", "/#impacto"]);
  });

  it("siempre tiene el botón para ver el radar", () => {
    for (const path of ["/", "/radar", "/tema/x"]) {
      expect(render(path)).toMatch(/href="\/radar"[^>]*>Ver el radar/);
    }
  });

  it("marca el radar como página actual dentro del radar y de un tema", () => {
    expect(render("/radar")).toMatch(/aria-current="page"[^>]*>Ver el radar/);
    expect(render("/tema/x")).toMatch(/aria-current="page"[^>]*>Ver el radar/);
    expect(render("/")).not.toContain('aria-current="page"');
  });

  it("queda fijo arriba al bajar por la página", () => {
    expect(render("/radar")).toMatch(/<header[^>]*class="[^"]*sticky top-0/);
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
