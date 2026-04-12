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

describe("Branching Mode", () => {
  test("players can be on different scenes", () => {
    const partition = new StatePartition();
    partition.setMode("branching");

    partition.setPlayerSnapshot("p1", makeSnapshot("forest", 2));
    partition.setPlayerSnapshot("p2", makeSnapshot("cave", 0));

    const p1Pos = partition.getPlayerPosition("p1");
    const p2Pos = partition.getPlayerPosition("p2");

    expect(p1Pos.sceneId).toBe("forest");
    expect(p1Pos.actionIndex).toBe(2);
    expect(p2Pos.sceneId).toBe("cave");
    expect(p2Pos.actionIndex).toBe(0);
  });

  test("ctx changes are isolated to the player who made them", () => {
    const partition = new StatePartition();
    partition.setMode("branching");

    partition.setPlayerCtx("p1", { gold: 100, weapon: "sword" });
    partition.setPlayerCtx("p2", { gold: 50, weapon: "bow" });

    expect(partition.getPlayerCtx("p1").gold).toBe(100);
    expect(partition.getPlayerCtx("p2").gold).toBe(50);

    // Mutating one doesn't affect the other
    const p1Ctx = partition.getPlayerCtx("p1");
    p1Ctx.gold = 999;
    expect(partition.getPlayerCtx("p1").gold).toBe(100); // returns copy
  });

  test("shared ctx is still accessible to all", () => {
    const partition = new StatePartition();
    partition.setMode("branching");

    partition.setSharedCtx({ worldTime: "night", weather: "rain" });
    partition.setPlayerCtx("p1", { gold: 100 });
    partition.setPlayerCtx("p2", { gold: 50 });

    expect(partition.getSharedCtx().worldTime).toBe("night");
    expect(partition.getSharedCtx().weather).toBe("rain");
  });
});
