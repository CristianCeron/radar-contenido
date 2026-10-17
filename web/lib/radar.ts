import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RadarSchema, type Radar } from "pipeline/schema";

// La web solo lee el radar.json que escribe el pipeline. Si el archivo no cumple el esquema, falla
// en el build en vez de mostrar datos rotos.
export function loadRadar(): Radar {
  const file = join(process.cwd(), "public", "data", "radar.json");
  return RadarSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}
