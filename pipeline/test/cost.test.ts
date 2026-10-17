import { describe, it, expect, vi } from "vitest";
import { CostLimitExceeded, createCostTracker, runWithCostLimit } from "../src/cost.js";
import { tokenCost } from "../src/llm/pricing.js";

describe("control de costo por corrida", () => {
  it("cada llamada suma su costo", () => {
    const tracker = createCostTracker({ limitUsd: 1 });
    tracker.sink({ label: "a", model: "m", usd: 0.1 });
    tracker.sink({ label: "b", model: "m", usd: 0.25 });
    expect(tracker.totalUsd()).toBeCloseTo(0.35);
    expect(tracker.calls()).toBe(2);
    expect(tracker.byLabel()).toEqual({ a: 0.1, b: 0.25 });
  });

  it("al superar el límite lanza CostLimitExceeded", () => {
    const tracker = createCostTracker({ limitUsd: 0.3 });
    tracker.sink({ label: "a", model: "m", usd: 0.2 });
    expect(() => tracker.sink({ label: "b", model: "m", usd: 0.2 })).toThrow(CostLimitExceeded);
    expect(tracker.totalUsd()).toBeCloseTo(0.4);
  });

  it("el tope detiene la corrida y conserva el resultado anterior", async () => {
    const write = vi.fn();
    const afterLimit = vi.fn();
    const res = await runWithCostLimit({
      limitUsd: 0.05,
      run: async (sink) => {
        sink({ label: "clasificacion", model: "m", usd: 0.03 });
        sink({ label: "explicacion", model: "m", usd: 0.04 });
        afterLimit();
        return { radar: true };
      },
      write,
    });
    expect(res).toMatchObject({ status: "cost_limit" });
    expect(res.totalUsd).toBeCloseTo(0.07);
    expect(afterLimit).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("si no supera el tope escribe el resultado y registra el total", async () => {
    const write = vi.fn();
    const res = await runWithCostLimit({
      limitUsd: 1,
      run: async (sink) => {
        sink({ label: "x", model: "m", usd: 0.2 });
        return { radar: true };
      },
      write,
    });
    expect(res).toMatchObject({ status: "ok", calls: 1 });
    expect(res.totalUsd).toBeCloseTo(0.2);
    expect(write).toHaveBeenCalledWith({ radar: true }, expect.objectContaining({ totalUsd: 0.2, limitUsd: 1, calls: 1 }));
  });

  it("otros errores se propagan sin escribir", async () => {
    const write = vi.fn();
    await expect(
      runWithCostLimit({ limitUsd: 1, run: async () => Promise.reject(new Error("fuente caída")), write }),
    ).rejects.toThrow("fuente caída");
    expect(write).not.toHaveBeenCalled();
  });

  it("calcula el costo por tokens según el modelo", () => {
    expect(tokenCost("claude-haiku-5-5", 1_000_000, 0)).toBeCloseTo(0.1);
    expect(tokenCost("claude-opus-5-5", 10_000, 2_000)).toBeCloseTo(0.08);
    expect(() => tokenCost("modelo-desconocido", 1, 1)).toThrow();
  });
});
