import { readdirSync, readFileSync } from "node:fs";
import { ProfileSchema, type Profile } from "./brief.js";

// Lee los perfiles de marca de config/perfiles. Solo lo usa el pipeline: la web importa los JSON directo.
const PROFILES_DIR = new URL("../config/perfiles/", import.meta.url);

export function loadProfiles(dir: URL = PROFILES_DIR): Profile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ProfileSchema.parse(JSON.parse(readFileSync(new URL(f, dir), "utf8"))));
}
