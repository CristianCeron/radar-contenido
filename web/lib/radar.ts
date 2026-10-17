import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RadarSchema, type Radar } from "pipeline/schema";

const RAYA = new RegExp(`\\s*${String.fromCharCode(0x2014)}\\s*`, "g");

// La página nunca muestra la raya larga, ni siquiera en títulos de artículos de terceros: se cambia
// por coma, que en esos títulos cumple la misma función.
export function sinRaya(text: string): string {
  return text.replace(RAYA, ", ");
}

function clean<T>(value: T): T {
  if (typeof value === "string") return sinRaya(value) as T;
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])) as T;
  }
  return value;
}

// La web solo lee el radar.json que escribe el pipeline. Si el archivo no cumple el esquema, falla
// en el build en vez de mostrar datos rotos.
export function loadRadar(): Radar {
  const file = join(process.cwd(), "public", "data", "radar.json");
  return clean(RadarSchema.parse(JSON.parse(readFileSync(file, "utf8"))));
}
