import { expect, test, describe } from "bun:test";
import { autoSavePlugin } from "../src/plugins/auto-save";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("auto-save — control", () => {
  test("pause stops saves", () => {
    const saves: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "L1" },
      { type: "text", speaker: "A", content: "L2" },
      { type: "text", speaker: "A", content: "L3" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      onSave: (_snap, slot) => saves.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1"); // save 1
    expect(saves).toHaveLength(1);

    plugin.pause();
    engine.next(); // no save
    expect(saves).toHaveLength(1);
  });

  test("resume re-enables saves", () => {
    const saves: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "L1" },
      { type: "text", speaker: "A", content: "L2" },
      { type: "text", speaker: "A", content: "L3" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      onSave: (_snap, slot) => saves.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1"); // save
    plugin.pause();
    engine.next(); // no save
    plugin.resume();
    engine.next(); // save

    expect(saves).toHaveLength(2);
  });

  test("isPaused reflects state", () => {
    const plugin = autoSavePlugin({
      interval: "every-action",
      onSave: () => {},
    });
    const engine = new KataEngine();
    engine.use(plugin);

    expect(plugin.isPaused()).toBe(false);
    plugin.pause();
    expect(plugin.isPaused()).toBe(true);
    plugin.resume();
    expect(plugin.isPaused()).toBe(false);
  });

  test("pausing during scene-change skips that save", () => {
    const saves: number[] = [];
    const s1 = makeScene("s1", [
      {
        type: "choice",
        choices: [{ id: "c1", label: "Go", target: "s2" }],
      },
    ]);
    const s2 = makeScene("s2", [
      { type: "text", speaker: "A", content: "Scene 2" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "scene-change",
      onSave: (_snap, slot) => saves.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(s1);
    engine.registerScene(s2);
    engine.start("s1"); // save on start

    plugin.pause();
    engine.makeChoice("c1"); // transition to s2, but paused — no save

    expect(saves).toHaveLength(1); // only the initial start save
  });

  test("slot index continues after pause/resume", () => {
    const saved: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "L1" },
      { type: "text", speaker: "A", content: "L2" },
      { type: "text", speaker: "A", content: "L3" },
      { type: "text", speaker: "A", content: "L4" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      maxSlots: 3,
      onSave: (_snap, slot) => saved.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1"); // slot 0
    plugin.pause();
    engine.next(); // skipped
    plugin.resume();
    engine.next(); // slot 1 (continues from where it left off)

    expect(saved).toEqual([0, 1]);
  });
});
