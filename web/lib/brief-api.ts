import type { Brief, Radar, Topic } from "pipeline/schema";

export type BriefSource = "en_vivo" | "precalculado" | "sin_brief";

export interface BriefResponse {
  source: BriefSource;
  brief?: Brief;
  notice?: string;
}

export interface BriefDeps {
  radar: Radar;
  generate: (topic: Topic, profileId: string) => Promise<Brief>;
  timeoutMs: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tardó más de ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Genera el brief en vivo; si el modelo falla o tarda, responde con el brief precalculado de la
// corrida diaria y lo indica. Sin ninguno de los dos, devuelve un mensaje claro.
export async function handleBriefRequest(
  body: unknown,
  deps: BriefDeps,
): Promise<{ status: number; body: BriefResponse }> {
  const { topicId, profileId } = (body ?? {}) as { topicId?: unknown; profileId?: unknown };
  if (typeof topicId !== "string" || typeof profileId !== "string") {
    return { status: 400, body: { source: "sin_brief", notice: "Falta el tema o el perfil." } };
  }
  const topic = deps.radar.topics.find((t) => t.id === topicId);
  const profile = deps.radar.profiles.find((p) => p.id === profileId);
  if (!topic || !profile) return { status: 404, body: { source: "sin_brief", notice: "Tema o perfil no encontrado." } };

  try {
    const brief = await withTimeout(deps.generate(topic, profileId), deps.timeoutMs);
    return { status: 200, body: { source: "en_vivo", brief } };
  } catch {
    const saved = topic.briefs[profileId];
    if (saved) {
      return {
        status: 200,
        body: { source: "precalculado", brief: saved, notice: "El modelo no respondió a tiempo; este es el brief de la corrida diaria." },
      };
    }
    return {
      status: 503,
      body: { source: "sin_brief", notice: "No pudimos generar el brief en este momento. Intenta de nuevo en un rato." },
    };
  }
}
