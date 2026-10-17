import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Source } from "./schema.js";
import { fetchArxiv } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hn.js";
import { fetchPress } from "./sources/rss.js";
import { fetchYouTube } from "./sources/youtube.js";
import type { SourceResult } from "./sources/types.js";

// El tema que rastrea el radar vive en configuración: búsquedas por fuente y el filtro de prensa.
// Cambiar de tema es cambiar un archivo, no el código.
export const TemaSchema = z.object({
  nombre: z.string().min(1),
  hackernews: z.array(z.string()).min(1),
  youtube: z.array(z.string()).min(1),
  arxiv: z.array(z.string()),
  filtroPrensa: z.object({ siglas: z.array(z.string()), terminos: z.array(z.string()) }),
});
export type Tema = z.infer<typeof TemaSchema>;

const CONFIG = new URL("../config/", import.meta.url);

export function loadTema(name = process.env.RADAR_TEMA): Tema {
  const url = name ? new URL(`temas/${name}.json`, CONFIG) : new URL("tema.json", CONFIG);
  if (!existsSync(url)) throw new Error(`No existe el tema "${name}" (${fileURLToPath(url)})`);
  return TemaSchema.parse(JSON.parse(readFileSync(url, "utf8")));
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Las siglas se exigen en mayúsculas (para no confundir "IA" con palabras comunes); los términos no.
// Los bordes de palabra contemplan tildes y eñes.
export function buildPressFilter(tema: Tema): (text: string) => boolean {
  const word = (alts: string[], flags: string) =>
    alts.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${alts.map(escape).join("|")})(?![\\p{L}\\p{N}])`, flags) : null;
  const siglas = word(tema.filtroPrensa.siglas, "u");
  const terminos = word(tema.filtroPrensa.terminos, "iu");
  return (text) => Boolean(siglas?.test(text) || terminos?.test(text));
}

// Fuentes de la corrida según el tema. Sin categorías de arXiv, esa fuente no se consulta.
export function sourcesFor(tema: Tema, now: Date): Partial<Record<Source, () => Promise<SourceResult>>> {
  const matches = buildPressFilter(tema);
  return {
    hackernews: () => fetchHackerNews({ now, hitsPerPage: 300, queries: tema.hackernews }),
    ...(tema.arxiv.length ? { arxiv: () => fetchArxiv({ now, maxResults: 300, categories: tema.arxiv }) } : {}),
    youtube: () => fetchYouTube({ now, queries: tema.youtube }),
    prensa: () => fetchPress({ now, matches }),
  };
}
