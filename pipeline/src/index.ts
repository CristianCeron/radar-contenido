import { fileURLToPath } from "node:url";
import { loadProfiles } from "./profiles.js";
import { createJevClassifier } from "./classify/jev.js";
import { createLLMClassifier } from "./classify/fallback.js";
import { createLLM } from "./llm/index.js";
import { runRadar } from "./orchestrator.js";
import { fetchSensor } from "./sources/sensor.js";
import { loadTema, sourcesFor } from "./tema.js";

const ROOT = new URL("../../", import.meta.url);

export interface PipelineOptions {
  outputPath?: string;
  cacheDir?: string;
  now?: Date;
}

// Corrida real con las claves del entorno. Escribe web/public/data/radar.json.
export async function runPipeline(opts: PipelineOptions = {}) {
  const now = opts.now ?? new Date();
  // El tema sale de config/tema.json, o de config/temas/<RADAR_TEMA>.json si se define.
  const tema = loadTema();
  const variant = process.env.RADAR_TEMA;
  const result = await runRadar({
    now,
    tema: tema.nombre,
    pilares: tema.pilares,
    maxPorPilar: tema.maxPorPilar,
    sources: {
      ...sourcesFor(tema, now),
      // Sensor humano: solo si hay hoja configurada.
      ...(process.env.SENSOR_SHEET_CSV_URL ? { equipo: () => fetchSensor({ now }) } : {}),
    },
    // Otro tema usa su propia caché y su propio archivo, para no pisar el radar publicado.
    cacheDir: opts.cacheDir ?? fileURLToPath(new URL(`pipeline/.cache/${variant ?? "principal"}/`, ROOT)),
    outputPath: opts.outputPath ?? fileURLToPath(new URL(`web/public/data/radar${variant ? `-${variant}` : ""}.json`, ROOT)),
    makeLLMs: (sink) => ({ fast: createLLM("fast", sink), writer: createLLM("writer", sink) }),
    makeClassifiers: (fast, sink) => ({
      primary: createJevClassifier({ onCost: sink, audiencia: tema.audiencia }),
      fallback: createLLMClassifier(fast, tema.audiencia),
    }),
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
