import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { NormalizedItem } from "../schema.js";
import { errorMessage, windowStart, type SourceOptions, type SourceResult } from "./types.js";

export interface Feed {
  outlet: string;
  url: string;
}

export interface PressOptions extends SourceOptions {
  feeds?: Feed[];
  // Qué notas cuentan para el tema. Por defecto, las que hablan de IA.
  matches?: (text: string) => boolean;
}

// Las siglas "IA" y "AI" se exigen en mayúsculas para no confundirlas con palabras comunes.
const AI_ACRONYM = /\b(IA|AI|LLM|GPT)\b/;
const AI_TERMS =
  /\b(inteligencia artificial|artificial intelligence|machine learning|aprendizaje autom[aá]tico|ChatGPT|OpenAI|Anthropic|Claude|Gemini|Copilot)\b/i;

export function isAboutAI(text: string): boolean {
  return AI_ACRONYM.test(text) || AI_TERMS.test(text);
}

export function loadFeeds(): Feed[] {
  const raw = readFileSync(new URL("../../config/feeds.json", import.meta.url), "utf8");
  return (JSON.parse(raw) as { feeds: Feed[] }).feeds;
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "#text" in (value as object)) return String((value as { "#text": unknown })["#text"]);
  return String(value);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function linkOf(entry: Record<string, unknown>): string {
  const link = entry.link;
  if (typeof link === "string") return link.trim();
  const links = Array.isArray(link) ? link : link ? [link] : [];
  const alt = links.find((l) => (l as Record<string, string>)["@_rel"] !== "self") as Record<string, string> | undefined;
  return (alt?.["@_href"] ?? text(entry.guid)).trim();
}

// Lee RSS 2.0 y Atom. El autor de la nota no se guarda: es un dato personal.
export function parseFeed(xml: string, outlet: string): NormalizedItem[] {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Feed mal formado: ${valid.err.msg}`);
  const parser = new XMLParser({ ignoreAttributes: false, isArray: (n) => n === "item" || n === "entry" });
  const doc = parser.parse(xml);
  const entries: Record<string, unknown>[] = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];

  const items: NormalizedItem[] = [];
  for (const entry of entries) {
    const title = stripHtml(text(entry.title));
    const url = linkOf(entry);
    const date = new Date(text(entry.pubDate ?? entry.published ?? entry.updated ?? entry["dc:date"]));
    if (!title || !/^https?:\/\//.test(url) || Number.isNaN(date.getTime())) continue;
    const summary = stripHtml(text(entry.description ?? entry.summary)).slice(0, 500);
    items.push({
      id: `prensa:${createHash("sha1").update(url).digest("hex").slice(0, 16)}`,
      source: "prensa",
      layer: "audiencia_ejecutiva",
      title,
      url,
      outlet,
      publishedAt: date.toISOString(),
      summary: summary || undefined,
      metrics: {},
    });
  }
  return items;
}

export async function fetchPress(opts: PressOptions = {}): Promise<SourceResult> {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const since = windowStart(now).getTime();
  const feeds = opts.feeds ?? loadFeeds();
  const matches = opts.matches ?? isAboutAI;
  const items: NormalizedItem[] = [];
  const failures: string[] = [];

  for (const feed of feeds) {
    try {
      const res = await doFetch(feed.url, { headers: { "User-Agent": "radar-contenido/0.1" } });
      if (!res.ok) throw new Error(`respondió ${res.status}`);
      const parsed = parseFeed(await res.text(), feed.outlet);
      for (const item of parsed) {
        const t = new Date(item.publishedAt).getTime();
        if (t >= since && t <= now.getTime() + 86400_000 && matches(`${item.title} ${item.summary ?? ""}`)) {
          items.push(item);
        }
      }
    } catch (err) {
      failures.push(`${feed.outlet}: ${errorMessage(err)}`);
    }
  }

  if (failures.length === feeds.length && feeds.length > 0) {
    return { status: "error", items: [], error: failures.join("; ") };
  }
  return { status: "ok", items, error: failures.length ? failures.join("; ") : undefined };
}
