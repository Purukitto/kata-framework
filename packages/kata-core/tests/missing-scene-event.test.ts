import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, Diagnostic } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Missing Scene — error-event strategy", () => {
  test("start() emits error and does not throw", () => {
    const engine = new KataEngine({}, { onMissingScene: "error-event" });
    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    // Should NOT throw
    engine.start("nonexistent");

    expect(errors).toHaveLength(1);
    expect(errors[0].level).toBe("error");
    expect(errors[0].message).toContain('Scene "nonexistent" not found');
    expect(errors[0].sceneId).toBe("nonexistent");
  });

  test("engine stays on current scene after missing target via makeChoice", () => {
    const scene = makeScene("intro", [
      {
        type: "choice",
        choices: [
          { id: "go", label: "Go", target: "nonexistent" },
        ],
      },
    ]);

    const engine = new KataEngine({}, { onMissingScene: "error-event" });
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    engine.start("intro");

    // Should be on the choice frame
    expect(frames).toHaveLength(1);
    expect(frames[0].action.type).toBe("choice");

    // Make choice with invalid target — should not throw
    engine.makeChoice("go");

    // Error emitted
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("nonexistent");

    // Engine re-emits current frame (stays on same scene)
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames[frames.length - 1].meta.id).toBe("intro");
  });

  test("engine still works with valid scene after error-event", () => {
    const scene1 = makeScene("intro", [
      { type: "text", speaker: "A", content: "hello" },
    ]);
    const scene2 = makeScene("chapter1", [
      { type: "text", speaker: "B", content: "world" },
    ]);

    const engine = new KataEngine({}, { onMissingScene: "error-event" });
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    // Try missing scene
    engine.start("nonexistent");
    expect(errors).toHaveLength(1);

    // Engine should still work with valid scenes
    engine.start("chapter1");

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("intro");

    expect(frames).toHaveLength(1);
    expect(frames[0].action.content).toBe("hello");
  });
});
