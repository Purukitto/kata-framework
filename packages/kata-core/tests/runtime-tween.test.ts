import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONFrame } from "../src/types";

describe("Runtime tween actions", () => {
  test("tween action emits 'update' with tween frame", () => {
    const scene: KSONScene = {
      meta: { id: "tween-test" },
      script: "",
      actions: [
        { type: "tween", target: "stranger", property: "x", from: 0, to: 400, duration: 800, easing: "ease-in-out" },
        { type: "text", speaker: "Narrator", content: "Done" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("tween-test");

    // Should emit the tween frame AND auto-advance to text frame
    expect(frames).toHaveLength(2);
    expect(frames[0]!.action.type).toBe("tween");
    expect(frames[1]!.action.type).toBe("text");
  });

  test("tween auto-advances past the tween action", () => {
    const scene: KSONScene = {
      meta: { id: "t" },
      script: "",
      actions: [
        { type: "tween", target: "a", property: "x", to: 100, duration: 500 },
        { type: "text", speaker: "N", content: "After tween" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("t");

    // The current frame should be the text (auto-advanced past tween)
    expect(frames[frames.length - 1]!.action.type).toBe("text");
  });

  test("tween-group emits a single frame with the group data", () => {
    const scene: KSONScene = {
      meta: { id: "tg" },
      script: "",
      actions: [
        {
          type: "tween-group",
          mode: "parallel" as const,
          tweens: [
            { target: "a", property: "opacity", to: 1, duration: 500 },
            { target: "b", property: "blur", to: 5, duration: 500 },
          ],
        },
        { type: "text", speaker: "N", content: "After group" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("tg");

    expect(frames).toHaveLength(2);
    expect(frames[0]!.action.type).toBe("tween-group");
    const group = frames[0]!.action as any;
    expect(group.tweens).toHaveLength(2);
  });

  test("tween at end of scene emits 'end'", () => {
    const scene: KSONScene = {
      meta: { id: "te" },
      script: "",
      actions: [
        { type: "tween", target: "a", property: "x", to: 100, duration: 500 },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const ends: any[] = [];
    engine.on("end", (e: any) => ends.push(e));

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("te");

    // Should emit the tween frame, then end
    expect(frames).toHaveLength(1);
    expect(frames[0]!.action.type).toBe("tween");
    expect(ends).toHaveLength(1);
    expect(ends[0].sceneId).toBe("te");
  });

  test("tween followed by text: next() on text still works", () => {
    const scene: KSONScene = {
      meta: { id: "tn" },
      script: "",
      actions: [
        { type: "tween", target: "a", property: "x", to: 100, duration: 500 },
        { type: "text", speaker: "A", content: "First" },
        { type: "text", speaker: "B", content: "Second" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("tn");
    // Auto-advanced past tween to "First"
    expect(frames).toHaveLength(2);

    engine.next();
    expect(frames).toHaveLength(3);
    expect(frames[2]!.action.type).toBe("text");
    if (frames[2]!.action.type === "text") {
      expect(frames[2]!.action.content).toBe("Second");
    }
  });

  test("multiple tweens in sequence all auto-advance", () => {
    const scene: KSONScene = {
      meta: { id: "mt" },
      script: "",
      actions: [
        { type: "tween", target: "a", property: "x", to: 100, duration: 300 },
        { type: "tween", target: "b", property: "y", to: 200, duration: 300 },
        { type: "text", speaker: "N", content: "After tweens" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("mt");

    // Both tweens emit frames, then auto-advance to text
    expect(frames).toHaveLength(3);
    expect(frames[0]!.action.type).toBe("tween");
    expect(frames[1]!.action.type).toBe("tween");
    expect(frames[2]!.action.type).toBe("text");
  });
});
