import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { NormalizedItem } from "../schema.js";
import { errorMessage, windowStart, type SourceOptions, type SourceResult } from "./types.js";

const ENDPOINT = "https://export.arxiv.org/api/query";

export const DEFAULT_ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG", "cs.MA"];

export interface ArxivOptions extends SourceOptions {
  categories?: string[];
  maxResults?: number;
}

interface AtomLink {
  "@_href": string;
  "@_rel"?: string;
}

interface AtomEntry {
  id: string;
  title: string;
  summary?: string;
  published?: string;
  updated?: string;
  link?: AtomLink | AtomLink[];
}

// arXiv usa fechas compactas AAAAMMDDHHMM en sus rangos.
function arxivDate(d: Date): string {
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 12);
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function toItem(entry: AtomEntry): NormalizedItem {
  const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
  const html = links.find((l) => l["@_rel"] === "alternate")?.["@_href"];
  const absId = String(entry.id).split("/abs/")[1] ?? String(entry.id);
  return {
    id: `arxiv:${absId.replace(/v\d+$/, "")}`,
    source: "arxiv",
    layer: "origen",
    title: clean(String(entry.title)),
    url: html ?? String(entry.id).replace(/^http:/, "https:"),
    outlet: "arXiv",
    publishedAt: new Date(entry.published ?? entry.updated ?? Date.now()).toISOString(),
    summary: entry.summary ? clean(String(entry.summary)) : undefined,
    metrics: {},
  };
}

export function parseArxiv(xml: string): NormalizedItem[] {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`XML de arXiv mal formado: ${valid.err.msg}`);
  const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "entry" });
  const doc = parser.parse(xml);
  const entries: AtomEntry[] = doc?.feed?.entry ?? [];
  return entries.map(toItem);
}

export async function fetchArxiv(opts: ArxivOptions = {}): Promise<SourceResult> {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const cats = (opts.categories ?? DEFAULT_ARXIV_CATEGORIES).map((c) => `cat:${c}`).join(" OR ");
  const range = `submittedDate:[${arxivDate(windowStart(now))} TO ${arxivDate(now)}]`;
  const params = new URLSearchParams({
    search_query: `(${cats}) AND ${range}`,
    sortBy: "submittedDate",
    sortOrder: "descending",
    max_results: String(opts.maxResults ?? 500),
  });

  try {
    const res = await doFetch(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`arXiv respondió ${res.status}`);
    return { status: "ok", items: parseArxiv(await res.text()) };
  } catch (err) {
    return { status: "error", items: [], error: errorMessage(err) };
  }
}
