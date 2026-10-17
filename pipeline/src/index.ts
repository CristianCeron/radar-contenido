import { fileURLToPath } from "node:url";
import { loadProfiles } from "./brief.js";
import { createJevClassifier } from "./classify/jev.js";
import { createLLMClassifier } from "./classify/fallback.js";
import { createLLM } from "./llm/index.js";
import { runRadar } from "./orchestrator.js";
import { fetchArxiv } from "./sources/arxiv.js";
import { fetchHackerNews } from "./sources/hn.js";
import { fetchPress } from "./sources/rss.js";
import { fetchYouTube } from "./sources/youtube.js";

const ROOT = new URL("../../", import.meta.url);

export interface PipelineOptions {
  outputPath?: string;
  cacheDir?: string;
  now?: Date;
}

// Corrida real con las claves del entorno. Escribe web/public/data/radar.json.
export async function runPipeline(opts: PipelineOptions = {}) {
  const now = opts.now ?? new Date();
  const result = await runRadar({
    now,
    sources: {
      hackernews: () => fetchHackerNews({ now, hitsPerPage: 300 }),
      arxiv: () => fetchArxiv({ now, maxResults: 300 }),
      youtube: () => fetchYouTube({ now }),
      prensa: () => fetchPress({ now }),
    },
    cacheDir: opts.cacheDir ?? fileURLToPath(new URL("pipeline/.cache/", ROOT)),
    outputPath: opts.outputPath ?? fileURLToPath(new URL("web/public/data/radar.json", ROOT)),
    makeLLMs: (sink) => ({ fast: createLLM("fast", sink), writer: createLLM("writer", sink) }),
    makeClassifiers: (fast, sink) => ({ primary: createJevClassifier({ onCost: sink }), fallback: createLLMClassifier(fast) }),
    profiles: loadProfiles(),
    limitUsd: Number(process.env.RUN_COST_LIMIT_USD ?? "1"),
  });
  console.log(
    result.status === "ok"
      ? `Radar escrito. Costo USD ${result.totalUsd.toFixed(4)} en ${result.calls} llamadas.`
      : `Corrida detenida por tope de costo (USD ${result.totalUsd.toFixed(4)} de ${result.limitUsd}). Se conserva el radar anterior.`,
  );
  return result;
}
