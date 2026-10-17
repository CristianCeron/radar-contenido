import type { Mention, NormalizedItem } from "./schema.js";
import type { SourceResult } from "./sources/types.js";

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|ref$|ref_src|si$|feature$)/;

// Dos enlaces que apuntan al mismo contenido quedan iguales tras normalizar.
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAMS.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? `?${new URLSearchParams(params)}` : "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${query}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

function titleTokens(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

const TITLE_SIMILARITY = 0.85;

function mentionOf(item: NormalizedItem): Mention {
  return { source: item.source, url: item.url, outlet: item.outlet, layer: item.layer };
}

function mergeMentions(a: Mention[], b: Mention[]): Mention[] {
  const seen = new Set(a.map((m) => `${m.source}|${normalizeUrl(m.url)}`));
  const out = [...a];
  for (const m of b) {
    const key = `${m.source}|${normalizeUrl(m.url)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

interface Group {
  item: NormalizedItem;
  tokens: Set<string>;
  mentions: Mention[];
}

// Reduce a uno los ítems con el mismo enlace o un título casi idéntico.
// Se conserva el publicado primero y se acumulan todas las fuentes que lo mencionan.
export function dedupe(items: NormalizedItem[]): NormalizedItem[] {
  const groups: Group[] = [];
  const byUrl = new Map<string, Group>();

  for (const item of items) {
    const key = normalizeUrl(item.url);
    const tokens = titleTokens(item.title);
    const ownMentions = item.mentions?.length ? item.mentions : [mentionOf(item)];

    let group = byUrl.get(key);
    if (!group && tokens.size >= 3) {
      group = groups.find((g) => jaccard(g.tokens, tokens) >= TITLE_SIMILARITY);
    }

    if (!group) {
      group = { item, tokens, mentions: ownMentions };
      groups.push(group);
    } else {
      group.mentions = mergeMentions(group.mentions, ownMentions);
      if (item.publishedAt < group.item.publishedAt) {
        group.item = item;
        group.tokens = tokens;
      }
    }
    byUrl.set(key, group);
  }

  return groups.map((g) => ({ ...g.item, mentions: g.mentions }));
}

export function mergeSources(results: SourceResult[]): NormalizedItem[] {
  return dedupe(results.flatMap((r) => r.items));
}
