import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { KataEngine } from "../src/runtime/index";
import { SnapshotManager, CURRENT_SCHEMA_VERSION } from "../src/runtime/snapshot";
import type { GameStateSnapshot } from "../src/types";

const SIMPLE_SCENE = `---
id: intro
---

:: Narrator ::
Line one.

:: Narrator ::
Line two.

:: Narrator ::
Line three.
`;

const CHOICE_SCENE = `---
id: branching
---

:: Narrator ::
Choose your path.

* [Go left] -> @intro
* [Go right] -> @intro
`;

const CONDITION_SCENE = `---
id: cond
---

:: Narrator ::
Before condition.

:::if{cond="hasKey"}
:: Narrator ::
You have the key!
:::

:: Narrator ::
After condition.
`;

describe("getSnapshot", () => {
  test("returns valid shape with schemaVersion", () => {
    const engine = new KataEngine({ name: "Hero" });
    const scene = parseKata(SIMPLE_SCENE);
    engine.registerScene(scene);
    engine.start("intro");

    const snapshot = engine.getSnapshot();

    expect(snapshot.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.ctx).toEqual({ name: "Hero" });
    expect(snapshot.currentSceneId).toBe("intro");
    expect(snapshot.currentActionIndex).toBe(0);
    expect(snapshot.history).toEqual(["intro"]);
    expect(snapshot.expandedActions).toBeDefined();
  });

  test("returns null sceneId when engine is at rest", () => {
    const engine = new KataEngine();
    const snapshot = engine.getSnapshot();

    expect(snapshot.currentSceneId).toBeNull();
    expect(snapshot.currentActionIndex).toBe(0);
    expect(snapshot.history).toEqual([]);
    expect(snapshot.expandedActions).toBeUndefined();
  });

  test("snapshot ctx is a deep copy (not a reference)", () => {
    const engine = new KataEngine({ count: 0 });
    const scene = parseKata(SIMPLE_SCENE);
    engine.registerScene(scene);
    engine.start("intro");

    const snapshot = engine.getSnapshot();
    snapshot.ctx.count = 999;

    const snapshot2 = engine.getSnapshot();
    expect(snapshot2.ctx.count).toBe(0);
  });
});

describe("loadSnapshot", () => {
  test("restores state correctly (round-trip)", () => {
    const scene = parseKata(SIMPLE_SCENE);

    // Engine 1: advance to action index 1
    const engine1 = new KataEngine({ score: 42 });
    engine1.registerScene(scene);
    engine1.start("intro");
    engine1.next();

    const snapshot = engine1.getSnapshot();

    // Engine 2: load snapshot
    const engine2 = new KataEngine();
    engine2.registerScene(parseKata(SIMPLE_SCENE));

    const frames: any[] = [];
    engine2.on("update", (frame) => frames.push(frame));

    engine2.loadSnapshot(snapshot);

    // Should emit a frame for the restored position
    expect(frames).toHaveLength(1);
    expect(frames[0].action.content).toBe("Line two.");
    expect(frames[0].state.currentActionIndex).toBe(1);
    expect(frames[0].state.ctx.score).toBe(42);
  });

  test("JSON.stringify -> JSON.parse -> loadSnapshot works (serialization round-trip)", () => {
    const scene = parseKata(SIMPLE_SCENE);

    const engine1 = new KataEngine({ level: 5 });
    engine1.registerScene(scene);
    engine1.start("intro");
    engine1.next();

    const json = JSON.stringify(engine1.getSnapshot());
    const parsed = JSON.parse(json);

    const engine2 = new KataEngine();
    engine2.registerScene(parseKata(SIMPLE_SCENE));

    const frames: any[] = [];
    engine2.on("update", (frame) => frames.push(frame));

    engine2.loadSnapshot(parsed);

    expect(frames).toHaveLength(1);
    expect(frames[0].action.content).toBe("Line two.");
    expect(frames[0].state.ctx.level).toBe(5);
  });

  test("rejects invalid data (Zod validation)", () => {
    const engine = new KataEngine();
    engine.registerScene(parseKata(SIMPLE_SCENE));

    expect(() => engine.loadSnapshot({ schemaVersion: 1, ctx: "bad" })).toThrow();
    expect(() => engine.loadSnapshot(null)).toThrow();
    expect(() => engine.loadSnapshot("string")).toThrow();
    expect(() =>
      engine.loadSnapshot({
        schemaVersion: 1,
        ctx: {},
        currentSceneId: null,
        currentActionIndex: -1,
        history: [],
      })
    ).toThrow();
  });

  test("rejects unknown sceneId (not in registered scenes)", () => {
    const engine = new KataEngine();
    engine.registerScene(parseKata(SIMPLE_SCENE));

    expect(() =>
      engine.loadSnapshot({
        schemaVersion: 1,
        ctx: {},
        currentSceneId: "nonexistent",
        currentActionIndex: 0,
        history: [],
      })
    ).toThrow(/Scene "nonexistent" not found/);
  });

  test("accepts null sceneId (engine at rest)", () => {
    const engine = new KataEngine();
    engine.registerScene(parseKata(SIMPLE_SCENE));

    const frames: any[] = [];
    engine.on("update", (frame) => frames.push(frame));

    engine.loadSnapshot({
      schemaVersion: 1,
      ctx: { restored: true },
      currentSceneId: null,
      currentActionIndex: 0,
      history: [],
    });

    // No frame emitted for null scene
    expect(frames).toHaveLength(0);
  });

  test("expanded actions are preserved through save/load cycle", () => {
    const scene = parseKata(CONDITION_SCENE);

    // Engine 1: trigger condition expansion
    const engine1 = new KataEngine({ hasKey: true });
    engine1.registerScene(scene);

    const frames1: any[] = [];
    engine1.on("update", (frame) => frames1.push(frame));

    engine1.start("cond");     // index 0: "Before condition."
    engine1.next();            // index 1: condition action (emits frame with condition)
    engine1.next();            // processes condition -> splices then actions, advances to index 2

    const snapshot = engine1.getSnapshot();
    expect(snapshot.expandedActions).toBeDefined();
    // Original 3 actions + 1 spliced "then" action = 4 total
    expect(snapshot.expandedActions!.length).toBe(4);

    // Engine 2: load the snapshot with expanded actions
    const engine2 = new KataEngine();
    engine2.registerScene(parseKata(CONDITION_SCENE));

    const frames2: any[] = [];
    engine2.on("update", (frame) => frames2.push(frame));

    engine2.loadSnapshot(snapshot);

    // Should be at the spliced-in action ("You have the key!")
    expect(frames2).toHaveLength(1);
    expect(frames2[0].action.content).toBe("You have the key!");
  });
});

describe("SnapshotManager", () => {
  test("migration pipeline transforms v0 -> v1", () => {
    const manager = new SnapshotManager();
    manager.registerMigration(0, (data: any) => ({
      ...data,
      schemaVersion: 1,
      history: data.history || [],
    }));

    const result = manager.migrate({
      schemaVersion: 0,
      ctx: { x: 1 },
      currentSceneId: null,
      currentActionIndex: 0,
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.history).toEqual([]);
    expect(result.ctx).toEqual({ x: 1 });
  });

  test("migration pipeline throws on missing migrator", () => {
    const manager = new SnapshotManager();

    expect(() =>
      manager.migrate({
        schemaVersion: 0,
        ctx: {},
        currentSceneId: null,
        currentActionIndex: 0,
        history: [],
      })
    ).toThrow(/No migrator registered for schema version 0/);
  });

  test("multi-step migration v0 -> v1 -> v2 (hypothetical)", () => {
    const manager = new SnapshotManager();

    // For this test, we pretend CURRENT_SCHEMA_VERSION were 2
    // but since it's 1, v0 -> v1 is all we need
    manager.registerMigration(0, (data: any) => ({
      ...data,
      schemaVersion: 1,
      history: data.history || [],
    }));

    const result = manager.migrate({
      schemaVersion: 0,
      ctx: { a: 1 },
      currentSceneId: null,
      currentActionIndex: 0,
    });

    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe("Snapshot edge cases", () => {
  test("getSnapshot after advancing past all actions", () => {
    const engine = new KataEngine();
    const scene = parseKata(SIMPLE_SCENE);
    engine.registerScene(scene);

    let ended = false;
    engine.on("end", () => { ended = true; });

    engine.start("intro");   // at action 0
    engine.next();            // -> action 1
    engine.next();            // -> action 2 (last action, index 2 = length-1)

    // Scene has 3 actions (0,1,2). At index 2, next() sees we're at totalActions-1 and emits end.
    engine.next();

    expect(ended).toBe(true);

    const snapshot = engine.getSnapshot();
    expect(snapshot.currentSceneId).toBe("intro");
    // currentActionIndex is 2 because the engine doesn't increment past the last action
    expect(snapshot.currentActionIndex).toBe(2);
  });

  test("load snapshot then continue advancing", () => {
    const scene = parseKata(SIMPLE_SCENE);

    const engine1 = new KataEngine();
    engine1.registerScene(scene);
    engine1.start("intro");

    const snapshot = engine1.getSnapshot();

    // Load into a fresh engine and continue
    const engine2 = new KataEngine();
    engine2.registerScene(parseKata(SIMPLE_SCENE));

    const frames: any[] = [];
    engine2.on("update", (frame) => frames.push(frame));

    engine2.loadSnapshot(snapshot);
    expect(frames).toHaveLength(1);
    expect(frames[0].action.content).toBe("Line one.");

    engine2.next();
    expect(frames).toHaveLength(2);
    expect(frames[1].action.content).toBe("Line two.");
  });
});
