import { z } from "zod";
import { HookTypeSchema } from "../schema.js";
import type { LLM } from "../llm/types.js";
import type { Classifier, RawClassification } from "./index.js";
import { HOOK_CRITERIA, KIND_CRITERIA, RELEVANCE_LEVELS } from "./questions.js";

const BatchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      executiveRelevance: z.number().min(0).max(1),
      kind: z.enum(["practico", "tecnico"]),
      hook: HookTypeSchema,
    }),
  ),
});

const SYSTEM = `Clasificas piezas de contenido sobre inteligencia artificial para un radar de contenido dirigido a ejecutivos de Latinoamérica.
Para cada pieza devuelve:
- executiveRelevance: número de 0 a 1. Guía: ${RELEVANCE_LEVELS.map((l, i) => `${(i / (RELEVANCE_LEVELS.length - 1)).toFixed(2)} = ${l}`).join("; ")}.
- kind: ${Object.entries(KIND_CRITERIA).map(([k, v]) => `"${k}" (${v})`).join(" o ")}.
- hook: uno de ${Object.entries(HOOK_CRITERIA).map(([k, v]) => `"${k}" (${v})`).join(", ")}.
Usa exactamente el id recibido. Clasifica todas las piezas.`;

// Respaldo del clasificador: un modelo de lenguaje barato que clasifica un lote por llamada.
export function createLLMClassifier(llm: LLM): Classifier {
  return {
    name: `llm:${llm.model}`,
    async classify(items) {
      const listing = items
        .map((i) => JSON.stringify({ id: i.id, titulo: i.title, fuente: i.outlet, resumen: i.summary?.slice(0, 300) ?? "" }))
        .join("\n");
      const result = await llm.json({
        label: "clasificacion-respaldo",
        system: SYSTEM,
        prompt: `Piezas (una por línea, en JSON):\n${listing}`,
        schema: BatchSchema,
        maxTokens: 500 + items.length * 120,
      });
      const ids = new Set(items.map((i) => i.id));
      const out = new Map<string, RawClassification>();
      for (const c of result.items) {
        if (ids.has(c.id)) out.set(c.id, { executiveRelevance: c.executiveRelevance, kind: c.kind, hook: c.hook, model: llm.model });
      }
      return out;
    },
  };
}
