import { HookTypeSchema, type NormalizedItem } from "../schema.js";
import type { CostSink } from "../llm/types.js";
import type { Classifier, RawClassification } from "./index.js";
import { DEFAULT_AUDIENCIA, HOOK_CRITERIA, KIND_CRITERIA, RELEVANCE_LEVELS } from "./questions.js";

// JEV (TypeSafe AI) es un modelo de decisión, no generativo: recibe un estado y preguntas
// tipadas y devuelve respuestas con probabilidades. Eden AI lo expone en un endpoint alfa.
const ENDPOINT = "https://api.edenai.run/v3/alpha/decisions";

export interface JevOptions {
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  concurrency?: number;
  onCost?: CostSink;
  audiencia?: string;
}

interface JevResponse {
  model: string;
  answers: {
    executive_relevance: { score: number };
    kind: { choice: string };
    hook: { choice: string };
  };
  cost?: number;
}

const questions = (audiencia: string) => ({
  executive_relevance: {
    type: "score",
    instructions: `Qué tan relevante es esta pieza para ${audiencia}`,
    criteria: RELEVANCE_LEVELS,
  },
  kind: {
    type: "choice",
    instructions: "¿La pieza es práctica para negocio o técnica?",
    criteria: KIND_CRITERIA,
  },
  hook: {
    type: "choice",
    instructions: "¿Qué tipo de gancho usa el título para captar atención?",
    criteria: HOOK_CRITERIA,
  },
});

export function createJevClassifier(opts: JevOptions = {}): Classifier {
  const apiKey = opts.apiKey ?? process.env.EDENAI_API_KEY ?? "";
  const model = opts.model ?? (process.env.EDENAI_MODEL || "typesafe/jev-latest");
  const doFetch = opts.fetch ?? fetch;
  const concurrency = opts.concurrency ?? 8;
  const maxScore = RELEVANCE_LEVELS.length - 1;

  async function classifyOne(item: NormalizedItem): Promise<RawClassification> {
    const res = await doFetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        state: { title: item.title, summary: item.summary?.slice(0, 600) ?? "", source: item.outlet },
        questions: questions(opts.audiencia ?? DEFAULT_AUDIENCIA),
      }),
    });
    if (!res.ok) throw new Error(`Eden AI respondió ${res.status}`);
    const data = (await res.json()) as JevResponse;
    if (typeof data.cost === "number") opts.onCost?.({ label: "clasificacion-jev", model: data.model, usd: data.cost });

    const hook = HookTypeSchema.safeParse(data.answers.hook.choice);
    return {
      executiveRelevance: Math.min(1, Math.max(0, data.answers.executive_relevance.score / maxScore)),
      kind: data.answers.kind.choice === "practico" ? "practico" : "tecnico",
      hook: hook.success ? hook.data : "otro",
      model: data.model,
    };
  }

  return {
    name: "jev",
    async classify(items) {
      if (!apiKey) throw new Error("Falta EDENAI_API_KEY");
      const out = new Map<string, RawClassification>();
      let next = 0;
      async function worker() {
        while (next < items.length) {
          const item = items[next++];
          out.set(item.id, await classifyOne(item));
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
      return out;
    },
  };
}
