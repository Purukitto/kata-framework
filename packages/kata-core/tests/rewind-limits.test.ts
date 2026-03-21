import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../types";

describe("Rewind Limits", () => {
  test("respects historyDepth", () => {
    const actions = [];
    for (let i = 0; i < 10; i++) {
      actions.push({ type: "text" as const, speaker: "A", content: `line ${i}` });
    }

    const scene: KSONScene = { meta: { id: "s1" }, script: "", actions };
    const engine = new KataEngine({}, { historyDepth: 3 });
    engine.registerScene(scene);

    engine.start("s1");
    for (let i = 0; i < 9; i++) {
      engine.next();
    }

    // Should be able to go back only 3 times
    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.back();
    engine.back();
    engine.back();

    const countBefore = frames.length;
    engine.back(); // should be no-op
    expect(frames.length).toBe(countBefore);
  });

  test("default historyDepth is 50", () => {
    const actions = [];
    for (let i = 0; i < 60; i++) {
      actions.push({ type: "text" as const, speaker: "A", content: `line ${i}` });
    }

    const scene: KSONScene = { meta: { id: "s1" }, script: "", actions };
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.start("s1");
    for (let i = 0; i < 59; i++) {
      engine.next();
    }

    // Try to go back more than 50 times
    let backCount = 0;
    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    for (let i = 0; i < 60; i++) {
      const before = frames.length;
      engine.back();
      if (frames.length > before) backCount++;
    }

    expect(backCount).toBe(50);
  });
});
