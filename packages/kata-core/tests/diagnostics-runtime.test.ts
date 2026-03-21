import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, Diagnostic } from "../types";

function makeScene(actions: any[]): KSONScene {
  return {
    meta: { id: "test" },
    script: "",
    actions,
  };
}

describe("Runtime Diagnostics", () => {
  test("emits error event on failed condition evaluate", () => {
    const scene = makeScene([
      { type: "condition", condition: "???broken!!!", then: [{ type: "text", speaker: "A", content: "hidden" }] },
      { type: "text", speaker: "Narrator", content: "After condition" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");
    // First frame is the condition action — calling next() evaluates it
    engine.next();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].level).toBe("error");
    expect(errors[0].message).toContain("Condition evaluation failed");
    expect(errors[0].sceneId).toBe("test");

    // Engine should continue — condition treated as false, shows "After condition"
    expect(frames.length).toBeGreaterThanOrEqual(2);
  });

  test("engine continues after non-fatal interpolation (missing var returns empty)", () => {
    const scene = makeScene([
      { type: "text", speaker: "Narrator", content: "Hello ${nonexistent}" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    // Interpolation of a missing path returns "" (not an error — just undefined resolution)
    expect(frames).toHaveLength(1);
    expect(frames[0].action.content).toBe("Hello ");
  });
});
