import { expect, test, describe } from "bun:test";
import {
  KataEngine,
  parseKata,
  createGameStore,
  evaluate,
  interpolate,
  SnapshotManager,
  CURRENT_SCHEMA_VERSION,
} from "../index";
import type {
  KSONScene,
  KSONAction,
  KSONFrame,
  KSONMeta,
  Choice,
  GameStateSnapshot,
  GameState,
  GameStore,
} from "../index";

describe("barrel exports", () => {
  test("all runtime exports are defined", () => {
    expect(KataEngine).toBeDefined();
    expect(parseKata).toBeDefined();
    expect(createGameStore).toBeDefined();
    expect(evaluate).toBeDefined();
    expect(interpolate).toBeDefined();
    expect(SnapshotManager).toBeDefined();
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
  });

  test("parseKata is callable through barrel", () => {
    const scene = parseKata("---\nid: test\n---\n:: Narrator ::\nHello.\n");
    expect(scene.meta.id).toBe("test");
    expect(scene.actions).toHaveLength(1);
  });

  test("KataEngine is constructable through barrel", () => {
    const engine = new KataEngine({ x: 1 });
    const scene = parseKata("---\nid: barrel-test\n---\n:: A ::\nLine.\n");
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("barrel-test");

    expect(frames).toHaveLength(1);
    expect(frames[0].state.ctx.x).toBe(1);
  });
});

describe("createGameStore restoreState", () => {
  test("restoreState bulk-replaces all state fields", () => {
    const store = createGameStore({ original: true });
    store.getState().setScene("scene-a");
    store.getState().nextAction();

    expect(store.getState().currentSceneId).toBe("scene-a");
    expect(store.getState().currentActionIndex).toBe(1);

    store.getState().restoreState({
      ctx: { restored: true },
      currentSceneId: "scene-b",
      currentActionIndex: 5,
      history: ["scene-b", "scene-c"],
    });

    const state = store.getState();
    expect(state.ctx).toEqual({ restored: true });
    expect(state.currentSceneId).toBe("scene-b");
    expect(state.currentActionIndex).toBe(5);
    expect(state.history).toEqual(["scene-b", "scene-c"]);
  });

  test("restoreState to null sceneId", () => {
    const store = createGameStore();
    store.getState().setScene("active");

    store.getState().restoreState({
      ctx: {},
      currentSceneId: null,
      currentActionIndex: 0,
      history: [],
    });

    expect(store.getState().currentSceneId).toBeNull();
  });
});
