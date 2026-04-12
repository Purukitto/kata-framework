import "./setup-dom";
import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React, { useEffect } from "react";
import { KataEngine, parseKata } from "@kata-framework/core";
import type { GameStateSnapshot } from "@kata-framework/core";
import { SaveManager } from "../src/SaveManager";
import { useSaveSlots } from "../src/useSaveSlots";
import { renderToContainer, createMockStorage, waitFor } from "./test-utils";

function makeEngine(): KataEngine {
  const engine = new KataEngine({ gold: 42 });
  const scene = parseKata(`---
id: test
---
:: Narrator ::
Hello world.
`);
  engine.registerScene(scene);
  engine.start("test");
  return engine;
}

/** Test harness — renders the hook and exposes its return value via side effects */
function HookHarness({
  saveManager,
  engine,
  onSlots,
  action,
}: {
  saveManager: SaveManager;
  engine: KataEngine;
  onSlots: (slots: ReturnType<typeof useSaveSlots>) => void;
  action?: (slots: ReturnType<typeof useSaveSlots>) => void;
}) {
  const result = useSaveSlots(saveManager, engine);

  useEffect(() => {
    onSlots(result);
    action?.(result);
  });

  return null;
}

describe("useSaveSlots", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let manager: SaveManager;
  let engine: KataEngine;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new SaveManager({ storage, prefix: "hook-test", maxSlots: 3, autoSaveSlot: 0 });
    engine = makeEngine();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  test("returns initial slots from SaveManager", async () => {
    let captured: ReturnType<typeof useSaveSlots> | null = null;
    const { unmount } = renderToContainer(
      <HookHarness
        saveManager={manager}
        engine={engine}
        onSlots={(s) => { captured = s; }}
      />
    );
    cleanup = unmount;

    await waitFor(50);
    expect(captured).not.toBeNull();
    expect(captured!.slots).toHaveLength(3);
    expect(captured!.slots[0]!.isEmpty).toBe(true);
    expect(captured!.slots[0]!.isAutoSave).toBe(true);
  });

  test("save writes to storage and updates slots", async () => {
    let latestSlots: ReturnType<typeof useSaveSlots> | null = null;

    const { unmount } = renderToContainer(
      <HookHarness
        saveManager={manager}
        engine={engine}
        onSlots={(s) => { latestSlots = s; }}
        action={(s) => {
          // Save on first render only
          if (s.slots[1]!.isEmpty) {
            s.save(1);
          }
        }}
      />
    );
    cleanup = unmount;

    await waitFor(100);
    expect(latestSlots!.slots[1]!.isEmpty).toBe(false);
    expect(latestSlots!.slots[1]!.sceneName).toBe("test");

    // Verify data is in storage
    const loaded = manager.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded!.ctx.gold).toBe(42);
  });

  test("load calls engine.loadSnapshot with stored data", async () => {
    // Pre-save a snapshot
    const snapshot = engine.getSnapshot();
    manager.save(0, snapshot);

    // Create a new engine with different state
    const engine2 = makeEngine();
    (engine2 as any).store?.setState?.({ ctx: { gold: 999 } });

    let loaded = false;
    const { unmount } = renderToContainer(
      <HookHarness
        saveManager={manager}
        engine={engine2}
        onSlots={() => {}}
        action={(s) => {
          if (!loaded) {
            loaded = true;
            s.load(0);
          }
        }}
      />
    );
    cleanup = unmount;

    await waitFor(100);
    // Engine should have loaded the snapshot
    const restoredSnapshot = engine2.getSnapshot();
    expect(restoredSnapshot.currentSceneId).toBe("test");
  });

  test("remove clears slot and updates list", async () => {
    // Pre-save
    manager.save(1, engine.getSnapshot());

    let latestSlots: ReturnType<typeof useSaveSlots> | null = null;
    let removed = false;

    const { unmount } = renderToContainer(
      <HookHarness
        saveManager={manager}
        engine={engine}
        onSlots={(s) => { latestSlots = s; }}
        action={(s) => {
          if (!removed && !s.slots[1]!.isEmpty) {
            removed = true;
            s.remove(1);
          }
        }}
      />
    );
    cleanup = unmount;

    await waitFor(100);
    expect(latestSlots!.slots[1]!.isEmpty).toBe(true);
    expect(manager.load(1)).toBeNull();
  });
});
