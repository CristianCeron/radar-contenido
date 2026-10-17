import { describe, it, expect } from "vitest";

describe("humo web", () => {
  it("expone la página raíz", async () => {
    const mod = await import("../app/page");
    expect(typeof mod.default).toBe("function");
  });
});
