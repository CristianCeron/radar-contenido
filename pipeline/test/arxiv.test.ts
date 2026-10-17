import { describe, it, expect } from "vitest";
import { fetchArxiv } from "../src/sources/arxiv.js";
import { NormalizedItemSchema } from "../src/schema.js";
import { fakeFetch, fixture } from "./helpers.js";

const now = new Date("2026-10-17T06:00:00Z");

describe("fuente arXiv", () => {
  it("normaliza el XML de arXiv en la capa origen", async () => {
    const f = fakeFetch(() => ({ body: fixture("arxiv-query.xml") }));
    const res = await fetchArxiv({ fetch: f, now });

    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(3);
    for (const item of res.items) expect(NormalizedItemSchema.safeParse(item).success).toBe(true);

    const first = res.items[0];
    expect(first).toMatchObject({
      id: "arxiv:2610.22372",
      source: "arxiv",
      layer: "origen",
      title: "LIBERO-PeRM: Benchmarking Personalized Robotic Manipulation",
      url: "https://arxiv.org/abs/2610.22372v1",
      outlet: "arXiv",
    });
    expect(first.summary?.length).toBeGreaterThan(50);
    expect(first.publishedAt).toMatch(/^2026-10-/);
  });

  it("filtra por categorías de IA y por fecha de envío", async () => {
    const f = fakeFetch(() => ({ body: fixture("arxiv-query.xml") }));
    await fetchArxiv({ fetch: f, now });
    const url = decodeURIComponent(f.calls[0]).replace(/\+/g, " ");
    expect(url).toContain("cat:cs.AI");
    expect(url).toContain("cat:cs.CL");
    expect(url).toMatch(/submittedDate:\[\d{12} TO \d{12}\]/);
  });

  it("reintenta cuando arXiv responde 503", async () => {
    let n = 0;
    const f = fakeFetch(() => (n++ === 0 ? { status: 503, body: "ocupado" } : { body: fixture("arxiv-query.xml") }));
    const res = await fetchArxiv({ fetch: f, now, retryDelayMs: 1 });
    expect(res.status).toBe("ok");
    expect(res.items).toHaveLength(3);
    expect(f.calls).toHaveLength(2);
  });

  it("un XML mal formado produce un error controlado", async () => {
    const f = fakeFetch(() => ({ body: "<feed><entry><title>roto</entry>" }));
    const res = await fetchArxiv({ fetch: f, now });
    expect(res.status).toBe("error");
    expect(res.items).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  it("un feed sin entradas devuelve lista vacía", async () => {
    const empty = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>x</title></feed>';
    const f = fakeFetch(() => ({ body: empty }));
    const res = await fetchArxiv({ fetch: f, now });
    expect(res).toMatchObject({ status: "ok", items: [] });
  });
});
