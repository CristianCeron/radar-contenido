import type { HookType } from "../schema.js";

// Niveles de relevancia para ejecutivos, de menor a mayor. El índice es el puntaje.
export const RELEVANCE_LEVELS = [
  "nula: solo le interesa a investigadores o ingenieros",
  "baja: curiosidad técnica sin uso claro en una empresa",
  "media: puede afectar a algunas áreas de la empresa a mediano plazo",
  "alta: un ejecutivo debería conocerlo este trimestre",
  "muy alta: cambia decisiones de negocio, inversión o equipos ya",
];

export const KIND_CRITERIA = {
  practico: "Se puede aplicar en una empresa sin saber programar: casos, herramientas, resultados, estrategia",
  tecnico: "Requiere conocimientos de ingeniería o investigación para entenderlo o aplicarlo",
};

export const HOOK_CRITERIA: Record<HookType, string> = {
  dato_sorprendente: "Abre con una cifra o hecho inesperado",
  tutorial: "Promete enseñar a hacer algo paso a paso",
  noticia: "Anuncia un lanzamiento, compra, regulación o hecho reciente",
  opinion: "Postura o análisis personal sobre un tema",
  caso_de_uso: "Muestra cómo una empresa o persona usa la IA y qué logró",
  comparativa: "Compara herramientas, modelos o enfoques",
  advertencia: "Alerta sobre un riesgo, error o mito",
  otro: "Ninguno de los anteriores",
};
