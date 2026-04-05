import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { generateA11yHints } from "../src/a11y/index";
import type { KSONScene, KSONFrame, KSONAction } from "../src/types";

describe("A11y hint generation", () => {
  test("text actions include role='dialog' and liveRegion='assertive'", () => {
    const action: KSONAction = { type: "text", speaker: "Narrator", content: "Hello world" };
    const hints = generateA11yHints(action);
    expect(hints.role).toBe("dialog");
    expect(hints.liveRegion).toBe("assertive");
  });

  test("text actions include label with speaker and content", () => {
    const action: KSONAction = { type: "text", speaker: "Guard", content: "Who goes there?" };
    const hints = generateA11yHints(action);
    expect(hints.label).toBe("Guard says: Who goes there?");
  });

  test("visual actions include description and role='img'", () => {
    const action: KSONAction = { type: "visual", layer: "background", src: "forest.jpg" };
    const hints = generateA11yHints(action);
    expect(hints.role).toBe("img");
    expect(hints.description).toContain("forest.jpg");
  });

  test("choice actions include role='group' and keyHints", () => {
    const action: KSONAction = {
      type: "choice",
      choices: [
        { id: "c_0", label: "Fight" },
        { id: "c_1", label: "Flee" },
      ],
    };
    const hints = generateA11yHints(action);
    expect(hints.role).toBe("group");
    expect(hints.liveRegion).toBe("polite");
    expect(hints.keyHints).toHaveLength(2);
    expect(hints.keyHints![0]!.hint).toBe("Press 1 for Fight");
    expect(hints.keyHints![1]!.hint).toBe("Press 2 for Flee");
  });

  test("wait actions have liveRegion='off'", () => {
    const action: KSONAction = { type: "wait", duration: 2000 };
    const hints = generateA11yHints(action);
    expect(hints.liveRegion).toBe("off");
  });

  test("exec actions return empty hints", () => {
    const action: KSONAction = { type: "exec", code: "ctx.x = 1" };
    const hints = generateA11yHints(action);
    expect(Object.keys(hints)).toHaveLength(0);
  });
});

describe("A11y hints on emitted frames", () => {
  test("frames include a11y field", () => {
    const scene: KSONScene = {
      meta: { id: "a11y-test" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Hello" }],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("a11y-test");

    expect(frames).toHaveLength(1);
    expect(frames[0]!.a11y).toBeDefined();
    expect(frames[0]!.a11y!.role).toBe("dialog");
    expect(frames[0]!.a11y!.liveRegion).toBe("assertive");
  });

  test("choice frames include keyHints", () => {
    const scene: KSONScene = {
      meta: { id: "a11y-choice" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Go left" }, { id: "c_1", label: "Go right" }] },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("a11y-choice");

    expect(frames[0]!.a11y!.keyHints).toHaveLength(2);
  });

  test("a11y field is backward compatible (old code can ignore it)", () => {
    const scene: KSONScene = {
      meta: { id: "compat" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Test" }],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("compat");

    // Destructure without a11y — should work fine
    const { meta, action, state } = frames[0]!;
    expect(meta.id).toBe("compat");
    expect(action.type).toBe("text");
    expect(state).toBeDefined();
  });
});
