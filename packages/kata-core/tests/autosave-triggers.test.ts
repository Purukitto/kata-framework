import { expect, test, describe } from "bun:test";
import { autoSavePlugin } from "../src/plugins/auto-save";
import type { GameStateSnapshot } from "../src/types";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("auto-save — triggers", () => {
  test("'scene-change' triggers save on scene transitions", () => {
    const saves: { snapshot: GameStateSnapshot; slot: number }[] = [];
    const s1 = makeScene("s1", [
      {
        type: "choice",
        choices: [{ id: "c1", label: "Go to s2", target: "s2" }],
      },
    ]);
    const s2 = makeScene("s2", [
      { type: "text", speaker: "A", content: "Scene 2" },
    ]);

    const engine = new KataEngine();
    engine.use(
      autoSavePlugin({
        interval: "scene-change",
        onSave: (snap, slot) => saves.push({ snapshot: snap, slot }),
      })
    );
    engine.registerScene(s1);
    engine.registerScene(s2);
    engine.start("s1");

    // First save on start (beforeSceneChange fires)
    expect(saves.length).toBe(1);

    engine.makeChoice("c1"); // transitions to s2 — triggers another save
    expect(saves.length).toBe(2);
  });

  test("'choice' triggers save when a choice is made", () => {
    const saves: number[] = [];
    const scene = makeScene("s1", [
      {
        type: "choice",
        choices: [{ id: "c1", label: "Pick", target: null }],
      },
    ]);

    const engine = new KataEngine();
    engine.use(
      autoSavePlugin({
        interval: "choice",
        onSave: (_snap, slot) => saves.push(slot),
      })
    );
    engine.registerScene(scene);
    engine.start("s1");

    expect(saves).toHaveLength(0); // no save on start for choice mode

    engine.makeChoice("c1");
    expect(saves).toHaveLength(1);
  });

  test("'every-action' triggers save on every action", () => {
    const saves: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Line 1" },
      { type: "text", speaker: "A", content: "Line 2" },
      { type: "text", speaker: "A", content: "Line 3" },
    ]);

    const engine = new KataEngine();
    engine.use(
      autoSavePlugin({
        interval: "every-action",
        onSave: (_snap, slot) => saves.push(slot),
      })
    );
    engine.registerScene(scene);
    engine.start("s1");

    // afterAction fires for the first action on start
    expect(saves).toHaveLength(1);

    engine.next();
    expect(saves).toHaveLength(2);

    engine.next();
    expect(saves).toHaveLength(3);
  });

  test("'scene-change' does NOT trigger on every action", () => {
    const saves: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Line 1" },
      { type: "text", speaker: "A", content: "Line 2" },
    ]);

    const engine = new KataEngine();
    engine.use(
      autoSavePlugin({
        interval: "scene-change",
        onSave: (_snap, slot) => saves.push(slot),
      })
    );
    engine.registerScene(scene);
    engine.start("s1"); // 1 save for scene-change

    engine.next(); // no save for next action
    expect(saves).toHaveLength(1);
  });

  test("snapshot contains correct scene state", () => {
    let lastSnapshot: GameStateSnapshot | null = null;
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);

    const engine = new KataEngine({ gold: 50 });
    engine.use(
      autoSavePlugin({
        interval: "every-action",
        onSave: (snap) => {
          lastSnapshot = snap;
        },
      })
    );
    engine.registerScene(scene);
    engine.start("s1");

    expect(lastSnapshot).not.toBeNull();
    expect(lastSnapshot!.ctx.gold).toBe(50);
    expect(lastSnapshot!.currentSceneId).toBe("s1");
  });
});
