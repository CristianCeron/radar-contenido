import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const workflowPath = `${root}.github/workflows/radar-diario.yml`;
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : "";

const SECRETS = ["YOUTUBE_API_KEY", "GEMINI_API_KEY", "EDENAI_API_KEY", "SENSOR_SHEET_CSV_URL"];

describe("actualización diaria automática", () => {
  it("existe el flujo de trabajo programado", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("corre cada madrugada y también se puede lanzar a mano", () => {
    const cron = workflow.match(/cron:\s*["'](\d+) (\d+) \* \* \*["']/);
    expect(cron).not.toBeNull();
    // Hora UTC entre las 8 y las 12 equivale a la madrugada en Colombia (UTC-5).
    expect(Number(cron![2])).toBeGreaterThanOrEqual(8);
    expect(Number(cron![2])).toBeLessThanOrEqual(12);
    expect(workflow).toContain("workflow_dispatch");
  });

  it("lee las claves solo desde los secretos de GitHub", () => {
    for (const name of SECRETS) {
      expect(workflow).toMatch(new RegExp(`${name}:\\s*\\$\\{\\{\\s*secrets\\.${name}\\s*\\}\\}`));
    }
  });

  it("ejecuta el pipeline y guarda el nuevo radar.json en el repositorio", () => {
    expect(workflow).toContain("npm run pipeline");
    expect(workflow).toContain("web/public/data/radar.json");
    expect(workflow).toMatch(/contents:\s*write/);
    expect(workflow).toContain("git push");
  });

  it("trae los cambios nuevos de la rama antes de subir el radar", () => {
    expect(workflow.indexOf("git pull --rebase")).toBeGreaterThan(-1);
    expect(workflow.indexOf("git pull --rebase")).toBeLessThan(workflow.lastIndexOf("git push"));
  });

  it("conserva la caché de fuentes entre corridas para el último resultado guardado", () => {
    expect(workflow).toContain("pipeline/.cache");
    expect(workflow).toContain("actions/cache");
  });

  it("ningún archivo del repositorio contiene claves", () => {
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter((f) => f && !f.endsWith("package-lock.json"));
    const keyPattern = /AIza[0-9A-Za-z_-]{30,}|sk-ant-[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9_-]{30,}|docs\.google\.com\/spreadsheets\/d\/e\/2PACX/;
    const leaks = files.filter((f) => {
      try {
        return keyPattern.test(readFileSync(`${root}${f}`, "utf8"));
      } catch {
        return false;
      }
    });
    expect(leaks).toEqual([]);
  });
});
