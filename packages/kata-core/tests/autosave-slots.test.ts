import { expect, test, describe } from "bun:test";
import { autoSavePlugin } from "../src/plugins/auto-save";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction, GameStateSnapshot } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("auto-save — slots", () => {
  test("saves rotate through maxSlots slots", () => {
    const saved: number[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "L1" },
      { type: "text", speaker: "A", content: "L2" },
      { type: "text", speaker: "A", content: "L3" },
      { type: "text", speaker: "A", content: "L4" },
      { type: "text", speaker: "A", content: "L5" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      maxSlots: 2,
      onSave: (_snap, slot) => saved.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1"); // save slot 0
    engine.next(); // save slot 1
    engine.next(); // save slot 0 (wraps)
    engine.next(); // save slot 1 (wraps)

    expect(saved).toEqual([0, 1, 0, 1]);
  });

  test("getSlots returns metadata without full snapshot", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
      { type: "text", speaker: "A", content: "World" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      maxSlots: 3,
      onSave: () => {},
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1");

    const slots = plugin.getSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0].index).toBe(0);
    expect(typeof slots[0].timestamp).toBe("number");
    expect(slots[0].sceneId).toBe("s1");
    // Verify no full snapshot data leaks
    expect((slots[0] as any).ctx).toBeUndefined();
  });

  test("oldest slot is overwritten when full", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "L1" },
      { type: "text", speaker: "A", content: "L2" },
      { type: "text", speaker: "A", content: "L3" },
    ]);

    const engine = new KataEngine();
    const plugin = autoSavePlugin({
      interval: "every-action",
      maxSlots: 2,
      onSave: () => {},
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1"); // slot 0
    engine.next(); // slot 1
    engine.next(); // slot 0 overwritten

    const slots = plugin.getSlots();
    expect(slots).toHaveLength(2);
    // Slot 0 should have a more recent timestamp than slot 1
    const slot0 = slots.find((s) => s.index === 0)!;
    const slot1 = slots.find((s) => s.index === 1)!;
    expect(slot0.timestamp).toBeGreaterThanOrEqual(slot1.timestamp);
  });

  test("default maxSlots is 3", () => {
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
      onSave: (_snap, slot) => saved.push(slot),
    });
    engine.use(plugin);
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();
    engine.next();
    engine.next(); // wraps to slot 0

    expect(saved).toEqual([0, 1, 2, 0]);
  });
});
