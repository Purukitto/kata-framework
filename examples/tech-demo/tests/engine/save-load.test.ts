import { describe, test, expect } from "bun:test";
import { createTestEngine } from "@kata-framework/test-utils";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

function loadAllScenes(): string[] {
  return [
    readScene("prologue.kata"),
    readScene("studio/booth.kata"),
    readScene("studio/first-broadcast.kata"),
    readScene("studio/caller-maria.kata"),
    readScene("studio/caller-vex.kata"),
    readScene("studio/editorial-choice.kata"),
    readScene("rooftop/signal-tower.kata"),
    readScene("endings/shutdown.kata"),
    readScene("endings/liberation.kata"),
    readScene("endings/underground.kata"),
  ];
}

describe("save/load snapshots", () => {
  test("snapshot captures current state", () => {
    const { engine } = createTestEngine(loadAllScenes());
    engine.start("prologue");

    const snapshot = engine.getSnapshot();
    expect(snapshot.currentSceneId).toBe("prologue");
    expect(snapshot.ctx).toBeDefined();
    expect(snapshot.schemaVersion).toBeGreaterThan(0);
  });

  test("snapshot round-trip preserves context", () => {
    const { engine } = createTestEngine(loadAllScenes());
    engine.start("prologue");

    // Advance through prologue (script sets initial ctx)
    // The script block runs on start, so ctx should be initialized
    const snapshot = engine.getSnapshot();

    // Create a new engine and load the snapshot
    const { engine: engine2 } = createTestEngine(loadAllScenes());
    engine2.start("prologue"); // need to start first to enable loading
    engine2.loadSnapshot(snapshot);

    const snapshot2 = engine2.getSnapshot();
    expect(snapshot2.currentSceneId).toBe(snapshot.currentSceneId);
    expect(snapshot2.currentActionIndex).toBe(snapshot.currentActionIndex);
  });

  test("snapshot includes history", () => {
    const { engine } = createTestEngine(loadAllScenes());
    engine.start("prologue");

    const snapshot = engine.getSnapshot();
    expect(snapshot.history).toBeDefined();
    expect(Array.isArray(snapshot.history)).toBe(true);
  });
});
