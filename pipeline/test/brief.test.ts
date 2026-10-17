import { describe, it, expect } from "vitest";
import { generateBrief, ProfileSchema, type Profile } from "../src/brief.js";
import { loadProfiles } from "../src/profiles.js";
import { BriefSchema } from "../src/schema.js";
import type { JsonRequest } from "../src/llm/types.js";
import { fakeLLM } from "./fake-llm.js";

const now = new Date("2026-10-17T06:00:00Z");

const topic = {
  label: "Agentes de IA",
  stage: "creciendo" as const,
  velocity: 64,
  explanation: {
    text: "Las empresas pasaron de probar chatbots a pedir agentes que ejecutan tareas.",
    evidence: [{ title: "Ask HN: agentes en producción", url: "https://news.ycombinator.com/item?id=1" }],
  },
  topPieces: [
    {
      title: "Cómo crear un agente sin programar",
      url: "https://www.youtube.com/watch?v=1",
      source: "youtube" as const,
      outlet: "Canal",
      hook: "tutorial" as const,
      format: "video largo",
    },
  ],
};

// El modelo falso responde con el primer formato y el primer producto que le ofrece el prompt,
// y copia el tono del perfil en el gancho. Así cada perfil produce un brief distinto.
function answerFromPrompt(req: JsonRequest<unknown>) {
  const formats = req.prompt.match(/Formatos de la marca: (.+)/)![1].split(" | ");
  const product = req.prompt.match(/- (.+?): /)![1];
  const tone = req.prompt.match(/Tono: (.+)/)![1];
  return {
    angle: `Ángulo para ${tone.slice(0, 20)}`,
    format: formats[0],
    hook: `Gancho con ${tone.slice(0, 30)}`,
    opportunity: { product, rationale: "Lleva del contenido al programa." },
  };
}

describe("perfiles de marca", () => {
  it("carga los perfiles de 30X y Andrés Bilbao con todos sus campos", () => {
    const profiles = loadProfiles();
    expect(profiles.map((p) => p.id).sort()).toEqual(["30x", "andres-bilbao"]);
    for (const p of profiles) {
      expect(ProfileSchema.safeParse(p).success).toBe(true);
      expect(p.productos.length).toBeGreaterThan(0);
      expect(p.formatos.length).toBeGreaterThan(0);
      expect(JSON.stringify(p)).not.toContain("—");
    }
  });
});

describe("generador de brief", () => {
  const profiles = loadProfiles();
  const p30x = profiles.find((p) => p.id === "30x")!;
  const pAndres = profiles.find((p) => p.id === "andres-bilbao")!;

  it("el brief tiene ángulo, formato, gancho y oportunidad ligada a un producto del perfil", async () => {
    const llm = fakeLLM(answerFromPrompt);
    const brief = await generateBrief(topic, p30x, { llm, now });
    expect(BriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.profileId).toBe("30x");
    expect(p30x.productos.map((x) => x.nombre)).toContain(brief.opportunity.product);
    expect(p30x.formatos).toContain(brief.format);
    expect(brief.generatedAt).toBe(now.toISOString());
  });

  it("los briefs de 30X y de Andrés Bilbao difieren en voz y formato", async () => {
    const llm = fakeLLM(answerFromPrompt);
    const a = await generateBrief(topic, p30x, { llm, now });
    const b = await generateBrief(topic, pAndres, { llm, now });
    expect(a.format).not.toBe(b.format);
    expect(a.hook).not.toBe(b.hook);
    expect(llm.requests[0].prompt).toContain(p30x.voz.tono);
    expect(llm.requests[1].prompt).toContain(pAndres.voz.tono);
    expect(llm.requests[1].prompt).toContain(pAndres.voz.evitar[0]);
  });

  it("rechaza un producto que no es de la marca", async () => {
    const llm = fakeLLM((req) => ({ ...answerFromPrompt(req), opportunity: { product: "Producto inventado", rationale: "x" } }));
    await expect(generateBrief(topic, p30x, { llm, now })).rejects.toThrow();
  });

  it("prohíbe al modelo inventar cifras que no están en la evidencia", async () => {
    const llm = fakeLLM(answerFromPrompt);
    await generateBrief(topic, p30x, { llm, now });
    expect(llm.requests[0].system).toMatch(/No inventes cifras/);
  });

  it("incluye la etapa y la explicación del tema en el pedido", async () => {
    const llm = fakeLLM(answerFromPrompt);
    await generateBrief(topic, p30x as Profile, { llm, now });
    expect(llm.requests[0].prompt).toContain("creciendo");
    expect(llm.requests[0].prompt).toContain(topic.explanation.text);
  });
});
