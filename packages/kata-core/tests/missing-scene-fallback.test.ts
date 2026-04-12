import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, Diagnostic } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Missing Scene — fallback strategy", () => {
  test("transitions to fallback scene when target is missing", () => {
    const fallbackScene = makeScene("error-scene", [
      { type: "text", speaker: "System", content: "Scene not found" },
    ]);

    const engine = new KataEngine({}, {
      onMissingScene: "fallback",
      fallbackSceneId: "error-scene",
    });
    engine.registerScene(fallbackScene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    engine.start("nonexistent");

    // Error event should fire
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Scene "nonexistent" not found');
    expect(errors[0].message).toContain("error-scene");

    // Engine should now be on the fallback scene
    expect(frames).toHaveLength(1);
    expect(frames[0].meta.id).toBe("error-scene");
    expect(frames[0].action.content).toBe("Scene not found");
  });

  test("sets ctx._errorSceneId to the missing scene ID", () => {
    const fallbackScene = makeScene("error-scene", [
      { type: "text", speaker: "System", content: "Error occurred" },
    ]);

    const engine = new KataEngine({}, {
      onMissingScene: "fallback",
      fallbackSceneId: "error-scene",
    });
    engine.registerScene(fallbackScene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("missing-target");

    expect(frames[0].state.ctx._errorSceneId).toBe("missing-target");
  });

  test("emits error and stays put when no fallbackSceneId is configured", () => {
    const introScene = makeScene("intro", [
      { type: "text", speaker: "A", content: "hello" },
    ]);

    const engine = new KataEngine({}, {
      onMissingScene: "fallback",
      // no fallbackSceneId
    });
    engine.registerScene(introScene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    // Start on a valid scene first
    engine.start("intro");

    // Now try missing scene — should emit errors, not throw
    engine.start("nonexistent");

    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some(e => e.message.includes("No fallbackSceneId configured"))).toBe(true);
  });

  test("emits error and stays put when fallback scene is also missing (no infinite loop)", () => {
    const introScene = makeScene("intro", [
      { type: "text", speaker: "A", content: "hello" },
    ]);

    const engine = new KataEngine({}, {
      onMissingScene: "fallback",
      fallbackSceneId: "also-missing",
    });
    engine.registerScene(introScene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    engine.start("intro");

    // Try missing scene where fallback is also missing
    engine.start("nonexistent");

    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some(e => e.message.includes("also not found"))).toBe(true);
  });

  test("makeChoice with fallback navigates to fallback scene", () => {
    const introScene = makeScene("intro", [
      {
        type: "choice",
        choices: [
          { id: "go", label: "Go", target: "nonexistent" },
        ],
      },
    ]);
    const fallbackScene = makeScene("error-scene", [
      { type: "text", speaker: "System", content: "Oops" },
    ]);

    const engine = new KataEngine({}, {
      onMissingScene: "fallback",
      fallbackSceneId: "error-scene",
    });
    engine.registerScene(introScene);
    engine.registerScene(fallbackScene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("intro");
    engine.makeChoice("go");

    // Should land on fallback scene
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.meta.id).toBe("error-scene");
    expect(lastFrame.action.content).toBe("Oops");
  });
});
