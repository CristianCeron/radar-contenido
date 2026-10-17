import { describe, it, expect, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeSteps } from "../components/WelcomeModal";
import { markWelcomeSeen, shouldShowWelcome } from "../lib/welcome";
import { BRAND_EVENT, saveBrand } from "../lib/brand";
import { STAGE_LABEL } from "../lib/format";

const profiles = [
  { id: "30x", nombre: "30X" },
  { id: "andres-bilbao", nombre: "Andrés Bilbao" },
];
const noop = () => {};

function render(step: number, brand = "30x") {
  return renderToStaticMarkup(
    <WelcomeSteps
      step={step}
      brand={brand}
      profiles={profiles}
      topicCount={10}
      onBrand={noop}
      onNext={noop}
      onBack={noop}
      onClose={noop}
      onStart={noop}
    />,
  );
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

const broken = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
} as unknown as Storage;

describe("primera visita", () => {
  it("se muestra hasta que se marca como vista", () => {
    const s = memoryStorage();
    expect(shouldShowWelcome(s)).toBe(true);
    markWelcomeSeen(s);
    expect(shouldShowWelcome(s)).toBe(false);
  });

  it("si el almacenamiento está bloqueado no rompe la página ni insiste", () => {
    expect(shouldShowWelcome(broken)).toBe(false);
    expect(() => markWelcomeSeen(broken)).not.toThrow();
  });
});

describe("pasos de la bienvenida", () => {
  it("es un diálogo modal con título y dice en qué paso va", () => {
    const html = render(1);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="bienvenida-titulo"');
    expect(html).toContain('id="bienvenida-titulo"');
    expect(html).toContain("Paso 1 de 3");
    expect(html).toContain('aria-label="Cerrar"');
  });

  it("paso 1: qué publicar y por qué, con el número real de temas", () => {
    const html = render(1);
    expect(html).toContain("Qué publicar esta semana");
    expect(html).toContain(">10 temas<");
    expect(html).toContain("Siguiente");
    expect(html).not.toContain("Atrás");
  });

  it("paso 2: cómo leer las cuatro etapas", () => {
    const html = render(2);
    expect(html).toContain("Paso 2 de 3");
    for (const s of Object.values(STAGE_LABEL)) expect(html).toContain(s);
    expect(html).toContain("Atrás");
  });

  it("paso 3: para quién es, con la marca elegida marcada y el botón para empezar", () => {
    const html = render(3, "andres-bilbao");
    expect(html).toContain("¿Para quién");
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*?Andrés Bilbao/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>.*?30X/);
    expect(html).toContain("Empezar");
    expect(html).not.toContain("Siguiente");
  });

  it("no usa la raya larga", () => {
    const raya = String.fromCharCode(0x2014);
    for (const n of [1, 2, 3]) expect(render(n)).not.toContain(raya);
  });
});

describe("marca elegida", () => {
  const original = (globalThis as { window?: unknown }).window;
  afterEach(() => {
    (globalThis as { window?: unknown }).window = original;
  });

  it("al guardarla avisa a los selectores abiertos", () => {
    const win = Object.assign(new EventTarget(), { localStorage: memoryStorage() });
    (globalThis as { window?: unknown }).window = win;
    let got: string | null = null;
    win.addEventListener(BRAND_EVENT, (e) => (got = (e as CustomEvent<string>).detail));
    saveBrand("andres-bilbao");
    expect(got).toBe("andres-bilbao");
    expect(win.localStorage.getItem("radar30x.marca")).toBe("andres-bilbao");
  });
});
