import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadRadar, sinRaya } from "../lib/radar";

const RAYA = String.fromCharCode(0x2014);

describe("carga del radar", () => {
  it("cambia la raya larga por coma, también en títulos de terceros", () => {
    expect(sinRaya(`Europe to dream bigger ${RAYA} with Nvidia`)).toBe("Europe to dream bigger, with Nvidia");
    expect(sinRaya(`uno${RAYA}dos`)).toBe("uno, dos");
    expect(sinRaya("sin cambios")).toBe("sin cambios");
  });

  it("el radar publicado se muestra sin rayas largas y sin perder enlaces", () => {
    const raw = readFileSync("public/data/radar.json", "utf8");
    const radar = loadRadar();
    expect(JSON.stringify(radar)).not.toContain(RAYA);
    const urls = (s: string) => s.match(/https?:\/\/[^"]+/g) ?? [];
    const found = urls(JSON.stringify(radar));
    expect(found.length).toBeGreaterThan(0);
    for (const u of found) expect(raw).toContain(u);
  });
});
