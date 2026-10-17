import { createHash } from "node:crypto";
import type { Layer, NormalizedItem } from "../schema.js";
import { normalizeUrl } from "../dedupe.js";
import { errorMessage, windowStart, type SourceOptions, type SourceResult } from "./types.js";

// Sensor humano: el equipo reporta publicaciones de redes en un formulario de Google y la hoja de
// respuestas se publica como CSV. El radar nunca abre esas redes: solo usa lo que la persona escribió.
// El enlace sirve para deduplicar; el orquestador se asegura de que no llegue al radar publicado.

export interface SensorOptions extends SourceOptions {
  url?: string;
}

type Platform = "LinkedIn" | "Instagram" | "TikTok" | "Facebook" | "YouTube" | "Otra red";

const LAYER_BY_PLATFORM: Record<Platform, Layer> = {
  LinkedIn: "audiencia_ejecutiva",
  Instagram: "difusion",
  TikTok: "difusion",
  Facebook: "difusion",
  YouTube: "difusion",
  "Otra red": "difusion",
};

// Servicios oEmbed oficiales y públicos: dado un enlace devuelven el título. No se usa el autor.
const OEMBED: Partial<Record<Platform, (link: string) => string>> = {
  TikTok: (link) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`,
  YouTube: (link) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`,
};

// Los enlaces de publicaciones de LinkedIn traen palabras del tema después del usuario:
// /posts/usuario_palabras-del-tema-activity-123. Se toma solo la parte del tema.
function linkedinTopic(link: string): string | null {
  const m = link.match(/linkedin\.com\/posts\/[^_/]+_([^/?#]+?)-(?:activity|ugcPost|share)-\d+/i);
  const words = m?.[1].replace(/-/g, " ").trim();
  return words && words.split(" ").length >= 2 ? words : null;
}

// Cuando la persona solo pegó el enlace, se intenta deducir de qué trata sin abrir la red social.
async function describeLink(link: string, platform: Platform, doFetch: typeof fetch): Promise<string | null> {
  if (platform === "LinkedIn") return linkedinTopic(link);
  const oembed = OEMBED[platform];
  if (!oembed) return null;
  try {
    const res = await doFetch(oembed(link));
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}

// Hora local de Colombia, que es la que registra el formulario.
const FORM_TZ_OFFSET = "-05:00";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findColumn(header: string[], ...hints: string[]): number {
  return header.findIndex((h) => hints.some((hint) => norm(h).includes(hint)));
}

function platformOf(declared: string, link: string): Platform {
  const text = norm(`${declared} ${link}`);
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("facebook") || text.includes("fb.com")) return "Facebook";
  if (text.includes("youtube") || text.includes("youtu.be")) return "YouTube";
  return "Otra red";
}

// Acepta "dd/mm/aaaa hh:mm:ss" (formulario en español), "mm/dd/aaaa ..." (en inglés) e ISO.
function parseTimestamp(raw: string, dayFirst: boolean): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, a, b, year, hh = "0", mm = "0", ss = "0"] = m;
  const [day, month] = dayFirst ? [a, b] : [b, a];
  const pad = (v: string) => v.padStart(2, "0");
  const d = new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hh)}:${pad(mm)}:${pad(ss)}${FORM_TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchSensor(opts: SensorOptions = {}): Promise<SourceResult> {
  const url = opts.url ?? process.env.SENSOR_SHEET_CSV_URL ?? "";
  if (!url) return { status: "error", items: [], error: "Sensor humano sin hoja configurada (SENSOR_SHEET_CSV_URL)" };

  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const since = windowStart(now).getTime();

  try {
    const res = await doFetch(url);
    if (!res.ok) throw new Error(`La hoja del sensor respondió ${res.status}`);
    const [header = [], ...rows] = parseCsv(await res.text());

    const col = {
      time: findColumn(header, "marca temporal", "timestamp", "fecha"),
      link: findColumn(header, "enlace", "link", "url"),
      platform: findColumn(header, "plataforma", "platform", "red"),
      about: findColumn(header, "trata", "descrip", "about", "tema"),
    };
    if (col.link < 0) throw new Error("La hoja del sensor no tiene una columna de enlace");
    const dayFirst = col.time < 0 || !norm(header[col.time]).includes("timestamp");

    const seen = new Set<string>();
    const items: NormalizedItem[] = [];
    for (const row of rows) {
      const link = row[col.link]?.trim() ?? "";
      if (!/^https?:\/\//.test(link)) continue;
      const key = normalizeUrl(link);
      if (seen.has(key)) continue;
      const date = col.time >= 0 ? parseTimestamp(row[col.time] ?? "", dayFirst) : now;
      if (!date || date.getTime() < since || date.getTime() > now.getTime() + 86400_000) continue;

      const platform = platformOf(col.platform >= 0 ? (row[col.platform] ?? "") : "", link);
      const about = (col.about >= 0 ? row[col.about]?.trim() : "") || (await describeLink(link, platform, doFetch));
      if (!about) continue;
      seen.add(key);
      items.push({
        id: `equipo:${createHash("sha1").update(key).digest("hex").slice(0, 16)}`,
        source: "equipo",
        layer: LAYER_BY_PLATFORM[platform],
        title: about.slice(0, 300),
        url: link,
        outlet: `${platform}, aportes del equipo`,
        publishedAt: date.toISOString(),
        metrics: {},
      });
    }
    return { status: "ok", items };
  } catch (err) {
    return { status: "error", items: [], error: errorMessage(err) };
  }
}
