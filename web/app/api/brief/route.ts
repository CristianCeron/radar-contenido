import { generateBrief } from "pipeline/brief";
import { createLLM } from "pipeline/llm";
import { handleBriefRequest } from "../../../lib/brief-api";
import { PROFILES } from "../../../lib/profiles";
import { loadRadar } from "../../../lib/radar";

export const runtime = "nodejs";
export const maxDuration = 30;

// Tiempo máximo para el brief en vivo antes de responder con el precalculado.
const LIVE_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await handleBriefRequest(body, {
    radar: loadRadar(),
    timeoutMs: LIVE_TIMEOUT_MS,
    generate: async (topic, profileId) => {
      const profile = PROFILES.find((p) => p.id === profileId);
      if (!profile) throw new Error(`Perfil desconocido: ${profileId}`);
      return generateBrief(topic, profile, { llm: createLLM("live") });
    },
  });
  return Response.json(result.body, { status: result.status });
}
