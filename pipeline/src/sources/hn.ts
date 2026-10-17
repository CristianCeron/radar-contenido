import type { NormalizedItem } from "../schema.js";
import { errorMessage, windowStart, type SourceOptions, type SourceResult } from "./types.js";

const ENDPOINT = "https://hn.algolia.com/api/v1/search_by_date";

export const DEFAULT_HN_QUERIES = ["AI", "LLM", "AI agents", "GPT", "Claude", "OpenAI", "machine learning"];

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  url: string | null;
  created_at: string;
  points: number | null;
  num_comments: number | null;
}

export interface HackerNewsOptions extends SourceOptions {
  queries?: string[];
  hitsPerPage?: number;
}

function toItem(hit: AlgoliaHit): NormalizedItem | null {
  if (!hit.title) return null;
  const thread = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  // El usuario que publicó no se guarda: es un dato personal.
  return {
    id: `hn:${hit.objectID}`,
    source: "hackernews",
    layer: "origen",
    title: hit.title,
    url: hit.url ?? thread,
    outlet: "Hacker News",
    publishedAt: new Date(hit.created_at).toISOString(),
    metrics: { points: hit.points ?? 0, comments: hit.num_comments ?? 0 },
  };
}

export async function fetchHackerNews(opts: HackerNewsOptions = {}): Promise<SourceResult> {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const since = Math.floor(windowStart(now).getTime() / 1000);
  const queries = opts.queries ?? DEFAULT_HN_QUERIES;
  const byId = new Map<string, NormalizedItem>();

  try {
    for (const query of queries) {
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `created_at_i>${since}`,
        hitsPerPage: String(opts.hitsPerPage ?? 500),
      });
      const res = await doFetch(`${ENDPOINT}?${params}`);
      if (!res.ok) throw new Error(`Hacker News respondió ${res.status}`);
      const data = (await res.json()) as { hits: AlgoliaHit[] };
      for (const hit of data.hits ?? []) {
        const item = toItem(hit);
        if (item && !byId.has(item.id)) byId.set(item.id, item);
      }
    }
    return { status: "ok", items: [...byId.values()] };
  } catch (err) {
    return { status: "error", items: [], error: errorMessage(err) };
  }
}
