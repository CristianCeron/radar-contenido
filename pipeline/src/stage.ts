import { LAYER_BY_SOURCE, type Layer, type NormalizedItem, type Stage } from "./schema.js";

export type LayerCounts = Record<Layer, number>;

export interface StageConfig {
  // Menciones mínimas para considerar que un tema está presente en una capa: un número para todas
  // o uno por capa (por ejemplo, exigir varias notas de prensa antes de llamar pico a un tema).
  minLayerMentions: number | LayerCounts;
  // Por debajo de esta velocidad, un tema que ya llegó a prensa ejecutiva está saturado.
  saturationVelocity: number;
}

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  minLayerMentions: 1,
  saturationVelocity: 0,
};

const LAYER_ORDER: Layer[] = ["origen", "difusion", "audiencia_ejecutiva"];

export function layerCounts(items: NormalizedItem[]): LayerCounts {
  const counts: LayerCounts = { origen: 0, difusion: 0, audiencia_ejecutiva: 0 };
  for (const item of items) {
    const mentions = item.mentions?.length ? item.mentions : [{ source: item.source, layer: item.layer }];
    for (const m of mentions) counts[m.layer ?? LAYER_BY_SOURCE[m.source]]++;
  }
  return counts;
}

export function presentLayers(counts: LayerCounts, minMentions = DEFAULT_STAGE_CONFIG.minLayerMentions): Layer[] {
  const min = (l: Layer) => (typeof minMentions === "number" ? minMentions : minMentions[l]);
  return LAYER_ORDER.filter((l) => counts[l] >= Math.max(1, min(l)));
}

// Umbrales usados en las corridas reales: una sola nota de prensa o un solo video no definen la etapa.
export const PRODUCTION_STAGE_CONFIG: Partial<StageConfig> = {
  minLayerMentions: { origen: 1, difusion: 2, audiencia_ejecutiva: 3 },
};

// Etapa según las capas donde aparece el tema y su velocidad:
// solo origen = emergente; llega a difusión = creciendo; llega a prensa ejecutiva = pico;
// en prensa ejecutiva y cayendo = saturado.
export function assignStage(
  input: { layers: LayerCounts; velocity: number | null },
  config: Partial<StageConfig> = {},
): Stage {
  const cfg = { ...DEFAULT_STAGE_CONFIG, ...config };
  const present = new Set(presentLayers(input.layers, cfg.minLayerMentions));

  if (present.has("audiencia_ejecutiva")) {
    if (input.velocity !== null && input.velocity < cfg.saturationVelocity) return "saturado";
    return "pico";
  }
  if (present.has("difusion")) return "creciendo";
  return "emergente";
}
