import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { generateA11yHints } from "../src/a11y/index";
import type { KSONScene, KSONFrame, KSONAction } from "../src/types";

describe("A11y hints for tween actions", () => {
  test("tween frames include description", () => {
    const action: KSONAction = {
      type: "tween",
      target: "stranger",
      property: "x",
      to: 400,
      duration: 800,
    };
    const hints = generateA11yHints(action);
    expect(hints.description).toBe("stranger animates x");
  });

  test("tween frames include reducedMotion flag", () => {
    const action: KSONAction = {
      type: "tween",
      target: "bg",
      property: "opacity",
      to: 1,
      duration: 500,
    };
    const hints = generateA11yHints(action);
    expect(hints.reducedMotion).toBe(true);
  });

  test("tween-group frames include combined description", () => {
    const action: KSONAction = {
      type: "tween-group",
      mode: "parallel",
      tweens: [
        { target: "a", property: "x", to: 100, duration: 300 },
        { target: "b", property: "y", to: 200, duration: 300 },
      ],
    };
    const hints = generateA11yHints(action);
    expect(hints.description).toContain("2 tweens");
    expect(hints.description).toContain("parallel");
    expect(hints.reducedMotion).toBe(true);
  });

  test("tween-group with single tween uses singular", () => {
    const action: KSONAction = {
      type: "tween-group",
      mode: "sequence",
      tweens: [{ target: "a", property: "x", to: 100, duration: 300 }],
    };
    const hints = generateA11yHints(action);
    expect(hints.description).toContain("1 tween");
    expect(hints.description).not.toContain("1 tweens");
  });

  test("tween a11y hints are included in emitted frames", () => {
    const scene: KSONScene = {
      meta: { id: "tween-a11y" },
      script: "",
      actions: [
        { type: "tween", target: "obj", property: "opacity", to: 1, duration: 500 },
        { type: "text", speaker: "N", content: "Done" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("tween-a11y");

    // First frame is tween with a11y
    expect(frames[0]!.a11y).toBeDefined();
    expect(frames[0]!.a11y!.reducedMotion).toBe(true);
    expect(frames[0]!.a11y!.description).toContain("obj animates opacity");
  });
});
