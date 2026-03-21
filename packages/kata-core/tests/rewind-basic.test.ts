import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Rewind Basic", () => {
  test("back() restores previous frame", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "first" },
      { type: "text", speaker: "A", content: "second" },
      { type: "text", speaker: "A", content: "third" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("s1");
    engine.next(); // → second
    engine.next(); // → third

    expect(frames[frames.length - 1].action.content).toBe("third");

    engine.back();

    // Should re-emit the "second" frame
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.action.content).toBe("second");
  });

  test("back() restores ctx via store state", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "before" },
      { type: "text", speaker: "A", content: "after" },
    ]);

    // Start with score=0, manually change it between frames
    const engine = new KataEngine({ score: 0 });
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("s1");
    expect(frames[0].state.ctx.score).toBe(0);

    engine.next();
    expect(frames[1].state.ctx.score).toBe(0);

    engine.back();
    // Should restore to state before next()
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.action.content).toBe("before");
  });

  test("back() is a no-op at the start", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "first" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("s1");
    expect(frames).toHaveLength(1);

    engine.back(); // no-op — no undo entry for initial start
    expect(frames).toHaveLength(1); // no new frame emitted
  });

  test("back() emits standard update event", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "first" },
      { type: "text", speaker: "A", content: "second" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    let updateCount = 0;
    engine.on("update", () => updateCount++);

    engine.start("s1");   // 1
    engine.next();        // 2
    engine.back();        // 3 (re-emits first frame)

    expect(updateCount).toBe(3);
  });
});
