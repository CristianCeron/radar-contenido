import { describe, it, expect } from "vitest";

describe("humo pipeline", () => {
  it("expone el punto de entrada del pipeline", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.runPipeline).toBe("function");
  });
});
