import { describe, expect, test } from "bun:test";
import { StatePartition } from "../src/state-partition";
import type { GameStateSnapshot } from "@kata-framework/core";

function makeSnapshot(sceneId: string, actionIndex: number, ctx: Record<string, any> = {}): GameStateSnapshot {
  return {
    schemaVersion: 3,
    ctx,
    currentSceneId: sceneId,
    currentActionIndex: actionIndex,
    history: [sceneId],
  };
}

describe("State Partitioning", () => {
  test("getSharedCtx returns the shared portion", () => {
    const partition = new StatePartition();
    partition.setSharedCtx({ worldState: "peace", day: 5 });

    const shared = partition.getSharedCtx();
    expect(shared.worldState).toBe("peace");
    expect(shared.day).toBe(5);
  });

  test("getPlayerCtx returns only that player's data", () => {
    const partition = new StatePartition();
    partition.setPlayerCtx("p1", { inventory: ["sword"] });
    partition.setPlayerCtx("p2", { inventory: ["bow", "arrows"] });

    const p1 = partition.getPlayerCtx("p1");
    const p2 = partition.getPlayerCtx("p2");

    expect(p1.inventory).toEqual(["sword"]);
    expect(p2.inventory).toEqual(["bow", "arrows"]);
  });

  test("getPlayerPosition returns scene/actionIndex per player", () => {
    const partition = new StatePartition();
    partition.setPlayerSnapshot("p1", makeSnapshot("intro", 3));
    partition.setPlayerSnapshot("p2", makeSnapshot("shop", 1));

    expect(partition.getPlayerPosition("p1")).toEqual({
      sceneId: "intro",
      actionIndex: 3,
    });
    expect(partition.getPlayerPosition("p2")).toEqual({
      sceneId: "shop",
      actionIndex: 1,
    });
  });

  test("getPlayerPosition returns null for unknown player", () => {
    const partition = new StatePartition();
    expect(partition.getPlayerPosition("unknown")).toEqual({
      sceneId: null,
      actionIndex: 0,
    });
  });

  test("mode defaults to shared", () => {
    const partition = new StatePartition();
    expect(partition.getMode()).toBe("shared");
  });

  test("mode can be set to branching", () => {
    const partition = new StatePartition();
    partition.setMode("branching");
    expect(partition.getMode()).toBe("branching");
  });

  test("snapshot data is captured per player in branching mode", () => {
    const partition = new StatePartition();
    partition.setMode("branching");

    const snap1 = makeSnapshot("forest", 5, { health: 100 });
    const snap2 = makeSnapshot("cave", 2, { health: 60 });

    partition.setPlayerSnapshot("p1", snap1);
    partition.setPlayerSnapshot("p2", snap2);

    expect(partition.getPlayerSnapshot("p1")?.currentSceneId).toBe("forest");
    expect(partition.getPlayerSnapshot("p2")?.currentSceneId).toBe("cave");
    expect(partition.getPlayerCtx("p1").health).toBe(100);
    expect(partition.getPlayerCtx("p2").health).toBe(60);
  });
});
