import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Rewind + Snapshot", () => {
  test("snapshots include undo history", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "first" },
      { type: "text", speaker: "A", content: "second" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();

    const snapshot = engine.getSnapshot();
    expect(snapshot.undoStack).toBeDefined();
    expect(snapshot.undoStack!.length).toBeGreaterThan(0);
    expect(snapshot.schemaVersion).toBe(3);
  });

  test("loading snapshot restores rewind capability", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "first" },
      { type: "text", speaker: "A", content: "second" },
      { type: "text", speaker: "A", content: "third" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();
    engine.next();

    const snapshot = engine.getSnapshot();

    // Create a new engine and load snapshot
    const engine2 = new KataEngine();
    engine2.registerScene(scene);

    const frames: any[] = [];
    engine2.on("update", (f) => frames.push(f));

    engine2.loadSnapshot(snapshot);

    // Should be at "third"
    expect(frames[frames.length - 1].action.content).toBe("third");

    // back() should work using restored undo stack
    engine2.back();
    expect(frames[frames.length - 1].action.content).toBe("second");
  });

  test("v1 snapshots migrate to v2 with empty undoStack", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "hello" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const v1Snapshot = {
      schemaVersion: 1,
      ctx: {},
      currentSceneId: "s1",
      currentActionIndex: 0,
      history: ["s1"],
    };

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    // Should not throw — migrator handles v1→v2
    engine.loadSnapshot(v1Snapshot);
    expect(frames).toHaveLength(1);
  });
});
