import type { NormalizedItem } from "../schema.js";
import { errorMessage, windowStart, type SourceOptions, type SourceResult } from "./types.js";

const API = "https://www.googleapis.com/youtube/v3";

// Cada búsqueda cuesta 100 unidades del cupo diario de 10.000.
export const DEFAULT_YOUTUBE_QUERIES = [
  "inteligencia artificial empresas",
  "agentes de IA",
  "IA para ejecutivos",
  "ChatGPT negocios",
  "AI agents",
  "Claude AI",
  "automatización con IA",
  "IA generativa",
];

export interface YouTubeOptions extends SourceOptions {
  apiKey?: string;
  queries?: string[];
  maxResults?: number;
}

interface SearchItem {
  id: { videoId?: string };
  snippet: { publishedAt: string; channelId: string; title: string; description: string; channelTitle: string };
}

interface VideoItem {
  id: string;
  statistics?: { viewCount?: string; commentCount?: string };
}

class QuotaExceeded extends Error {}

async function getJson<T>(doFetch: typeof fetch, url: string): Promise<T> {
  const res = await doFetch(url);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || (res.status === 403 && /quotaExceeded|rateLimitExceeded|dailyLimitExceeded/.test(body))) {
      throw new QuotaExceeded("Cupo de YouTube agotado");
    }
    throw new Error(`YouTube respondió ${res.status}`);
  }
  return (await res.json()) as T;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchYouTube(opts: YouTubeOptions = {}): Promise<SourceResult> {
  const apiKey = opts.apiKey ?? process.env.YOUTUBE_API_KEY ?? "";
  if (!apiKey) return { status: "error", items: [], error: "Falta YOUTUBE_API_KEY" };

  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const publishedAfter = windowStart(now).toISOString();
  const byId = new Map<string, NormalizedItem>();

  try {
    for (const q of opts.queries ?? DEFAULT_YOUTUBE_QUERIES) {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        q,
        publishedAfter,
        order: "viewCount",
        maxResults: String(opts.maxResults ?? 50),
        key: apiKey,
      });
      const search = await getJson<{ items?: SearchItem[] }>(doFetch, `${API}/search?${params}`);
      const fresh = (search.items ?? []).filter((it) => it.id.videoId && !byId.has(`yt:${it.id.videoId}`));
      if (fresh.length === 0) continue;

      const ids = fresh.map((it) => it.id.videoId!).join(",");
      const stats = await getJson<{ items?: VideoItem[] }>(
        doFetch,
        `${API}/videos?${new URLSearchParams({ part: "statistics", id: ids, key: apiKey })}`,
      );
      const statsById = new Map((stats.items ?? []).map((v) => [v.id, v.statistics ?? {}]));

      for (const it of fresh) {
        const videoId = it.id.videoId!;
        const st = statsById.get(videoId) ?? {};
        byId.set(`yt:${videoId}`, {
          id: `yt:${videoId}`,
          source: "youtube",
          layer: "difusion",
          title: decode(it.snippet.title),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          outlet: decode(it.snippet.channelTitle),
          publishedAt: new Date(it.snippet.publishedAt).toISOString(),
          summary: it.snippet.description ? decode(it.snippet.description) : undefined,
          metrics: { views: Number(st.viewCount ?? 0), comments: Number(st.commentCount ?? 0) },
        });
      }
    }
    return { status: "ok", items: [...byId.values()] };
  } catch (err) {
    const status = err instanceof QuotaExceeded ? "cupo_agotado" : "error";
    return { status, items: [...byId.values()], error: errorMessage(err) };
  }
}
