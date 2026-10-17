// Genera un radar.json de ejemplo para pruebas y para la web mientras no hay corrida real.
// Uso: node scripts/gen-ejemplo.mjs <ruta-salida>
import { writeFileSync } from "node:fs";

const end = new Date("2026-10-16T00:00:00Z");
const series = (f) =>
  Array.from({ length: 30 }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return { date: d.toISOString().slice(0, 10), count: Math.max(0, Math.round(f(i))) };
  });
const brief = (profileId, angle, format, hook, product, rationale) => ({
  profileId,
  angle,
  format,
  hook,
  opportunity: { product, rationale },
  generatedAt: "2026-10-16T06:10:00.000Z",
});

const radar = {
  generatedAt: "2026-10-16T06:12:00.000Z",
  windowDays: 30,
  cost: { totalUsd: 0.18, limitUsd: 1, calls: 42 },
  sources: [
    { source: "hackernews", status: "ok", fetchedAt: "2026-10-16T06:00:00.000Z", items: 320 },
    { source: "arxiv", status: "ok", fetchedAt: "2026-10-16T06:00:05.000Z", items: 210 },
    { source: "youtube", status: "cupo_agotado", fetchedAt: "2026-10-15T06:00:00.000Z", items: 80 },
    { source: "prensa", status: "ok", fetchedAt: "2026-10-16T06:00:09.000Z", items: 64 },
  ],
  profiles: [
    { id: "30x", nombre: "30X" },
    { id: "andres-bilbao", nombre: "Andrés Bilbao" },
  ],
  topics: [
    {
      id: "agentes-de-ia",
      label: "Agentes de IA",
      stage: "creciendo",
      velocity: 64,
      executiveRelevance: 0.86,
      score: 55.04,
      layers: ["origen", "difusion"],
      series: series((i) => 4 + i * 0.6 + (i > 22 ? (i - 22) * 2 : 0)),
      channels: [
        { name: "Hacker News", source: "hackernews", url: "https://news.ycombinator.com", count: 38 },
        { name: "Canal de ejemplo", source: "youtube", url: "https://www.youtube.com/@ejemplo", count: 6 },
      ],
      topPieces: [
        {
          title: "Cómo montar un agente que responde correos",
          url: "https://www.youtube.com/watch?v=ejemplo1",
          source: "youtube",
          outlet: "Canal de ejemplo",
          hook: "tutorial",
          format: "video largo",
          analysis: "Promete un resultado concreto en el título y lo muestra en los primeros 20 segundos.",
        },
      ],
      explanation: {
        text: "Las empresas pasaron de probar chatbots a pedir agentes que ejecutan tareas. En Hacker News se duplicaron los hilos sobre agentes en producción y en YouTube crecen los tutoriales paso a paso.",
        evidence: [
          { title: "Ask HN: ¿Quién usa agentes en producción?", url: "https://news.ycombinator.com/item?id=1000001" },
          { title: "Cómo montar un agente que responde correos", url: "https://www.youtube.com/watch?v=ejemplo1" },
        ],
      },
      briefs: {
        "30x": brief(
          "30x",
          "Qué tareas de tu equipo ya puede hacer un agente esta semana",
          "carrusel de Instagram",
          "3 tareas que tu equipo hace a mano y un agente ya resuelve",
          "AI for Executives",
          "Muestra el caso práctico y lleva al programa para implementarlo con ROI.",
        ),
        "andres-bilbao": brief(
          "andres-bilbao",
          "Lo que aprendí delegando trabajo real a un agente",
          "reel",
          "Le di a un agente una tarea de mi equipo. Esto pasó.",
          "Inmersión Ejecutiva 30X",
          "La historia en primera persona abre la conversación y la inmersión da el método.",
        ),
      },
    },
    {
      id: "modelos-pequenos",
      label: "Modelos pequeños en el dispositivo",
      stage: "emergente",
      velocity: 120,
      executiveRelevance: 0.52,
      score: 62.4,
      layers: ["origen"],
      series: series((i) => (i > 20 ? (i - 20) * 1.5 : 0.4)),
      channels: [{ name: "arXiv", source: "arxiv", url: "https://arxiv.org", count: 14 }],
      topPieces: [],
      explanation: {
        text: "Aparecen varios artículos sobre modelos que corren en el teléfono sin nube. Aún no llegan a YouTube ni a prensa: es una señal temprana.",
        evidence: [{ title: "Artículo de ejemplo en arXiv", url: "https://arxiv.org/abs/2610.00001" }],
      },
      briefs: {},
    },
  ],
};

writeFileSync(process.argv[2], JSON.stringify(radar, null, 2) + "\n");
