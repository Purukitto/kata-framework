import { expect, test, describe, beforeEach } from "bun:test";
import { SaveManager } from "../src/SaveManager";
import type { GameStateSnapshot } from "@kata-framework/core";
import { createMockStorage } from "./test-utils";

function makeSnapshot(overrides: Partial<GameStateSnapshot> = {}): GameStateSnapshot {
  return {
    schemaVersion: 3,
    ctx: { gold: 100 },
    currentSceneId: "intro",
    currentActionIndex: 2,
    history: ["intro"],
    ...overrides,
  };
}

describe("SaveManager", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let manager: SaveManager;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new SaveManager({ storage, prefix: "test", maxSlots: 3 });
  });

  test("save and load roundtrip", () => {
    const snapshot = makeSnapshot();
    manager.save(0, snapshot);
    const loaded = manager.load(0);
    expect(loaded).toEqual(snapshot);
  });

  test("load returns null for empty slot", () => {
    expect(manager.load(0)).toBeNull();
  });

  test("load returns null for corrupted data", () => {
    storage.setItem("test-slot-0", "not valid json{{{");
    expect(manager.load(0)).toBeNull();
  });

  test("getSlots returns correct metadata", () => {
    const snapshot = makeSnapshot({ currentSceneId: "forest" });
    manager.save(1, snapshot);

    const slots = manager.getSlots();
    expect(slots).toHaveLength(3);

    // Slot 0: empty
    expect(slots[0]!.isEmpty).toBe(true);
    expect(slots[0]!.sceneName).toBeNull();
    expect(slots[0]!.timestamp).toBeNull();

    // Slot 1: has data
    expect(slots[1]!.isEmpty).toBe(false);
    expect(slots[1]!.sceneName).toBe("forest");
    expect(slots[1]!.timestamp).toBeGreaterThan(0);

    // Slot 2: empty
    expect(slots[2]!.isEmpty).toBe(true);
  });

  test("remove clears a slot", () => {
    manager.save(0, makeSnapshot());
    expect(manager.load(0)).not.toBeNull();

    manager.remove(0);
    expect(manager.load(0)).toBeNull();
    expect(manager.getSlotMeta(0).isEmpty).toBe(true);
  });

  test("out-of-range index throws RangeError", () => {
    expect(() => manager.save(-1, makeSnapshot())).toThrow(RangeError);
    expect(() => manager.save(3, makeSnapshot())).toThrow(RangeError);
    expect(() => manager.load(5)).toThrow(RangeError);
    expect(() => manager.remove(10)).toThrow(RangeError);
  });

  test("prefix isolation — different prefixes don't collide", () => {
    const managerA = new SaveManager({ storage, prefix: "game-a", maxSlots: 3 });
    const managerB = new SaveManager({ storage, prefix: "game-b", maxSlots: 3 });

    managerA.save(0, makeSnapshot({ currentSceneId: "scene-a" }));
    managerB.save(0, makeSnapshot({ currentSceneId: "scene-b" }));

    expect(managerA.load(0)!.currentSceneId).toBe("scene-a");
    expect(managerB.load(0)!.currentSceneId).toBe("scene-b");
  });

  test("autoSaveSlot is marked in slot metadata", () => {
    const mgr = new SaveManager({ storage, prefix: "test", maxSlots: 3, autoSaveSlot: 0 });
    const slots = mgr.getSlots();

    expect(slots[0]!.isAutoSave).toBe(true);
    expect(slots[1]!.isAutoSave).toBe(false);
    expect(slots[2]!.isAutoSave).toBe(false);
  });

  test("corrupted meta returns empty slot", () => {
    storage.setItem("test-meta-0", "broken json");
    const slot = manager.getSlotMeta(0);
    expect(slot.isEmpty).toBe(true);
  });

  test("maxSlots and autoSaveSlot getters", () => {
    const mgr = new SaveManager({ storage, maxSlots: 5, autoSaveSlot: 2 });
    expect(mgr.maxSlots).toBe(5);
    expect(mgr.autoSaveSlot).toBe(2);
  });

  test("overwriting a slot replaces data", () => {
    manager.save(0, makeSnapshot({ currentSceneId: "scene-1" }));
    manager.save(0, makeSnapshot({ currentSceneId: "scene-2" }));
    expect(manager.load(0)!.currentSceneId).toBe("scene-2");
  });
});
