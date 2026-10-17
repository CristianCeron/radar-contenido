import type { Brief } from "pipeline/schema";
import type { BriefResponse } from "./brief-api";

// corrida: el brief que dejó el radar diario. en_vivo: recién generado. precalculado: se pidió en
// vivo, el modelo no respondió y la API devolvió el de la corrida.
export type BriefOrigin = "corrida" | "en_vivo" | "precalculado";

export interface ShownBrief {
  brief?: Brief;
  origin: BriefOrigin;
  failed?: boolean;
}

export function initialShown(profiles: { id: string }[], briefs: Record<string, Brief>): Record<string, ShownBrief> {
  return Object.fromEntries(profiles.map((p) => [p.id, briefs[p.id] ? { brief: briefs[p.id], origin: "corrida" } : { origin: "corrida" }]));
}

// Aplica la respuesta de /api/brief. Si no llegó brief, conserva el último y marca la falla.
export function applyResponse(prev: ShownBrief | undefined, res: BriefResponse | null): ShownBrief {
  if (res?.brief && (res.source === "en_vivo" || res.source === "precalculado")) {
    return { brief: res.brief, origin: res.source };
  }
  return { ...(prev ?? { origin: "corrida" }), failed: true };
}

export function briefText(brief: Brief, marca: string, tema: string): string {
  const rationale = brief.opportunity.rationale.trim();
  return [
    `Brief para ${marca} · ${tema}`,
    "",
    `Gancho: ${brief.hook}`,
    `Ángulo: ${brief.angle}`,
    `Formato: ${brief.format}`,
    `Oportunidad: ${brief.opportunity.product}${rationale ? `. ${rationale}` : ""}`,
  ].join("\n");
}
