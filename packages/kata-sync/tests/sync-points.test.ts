import { describe, expect, test } from "bun:test";
import { StatePartition } from "../src/state-partition";

describe("Sync Points", () => {
  test("players arriving triggers convergence when all present", () => {
    const partition = new StatePartition();
    partition.setMode("branching");
    partition.registerSyncPoint("forest", "boss-fight");
    partition.registerSyncPoint("cave", "boss-fight");

    const totalPlayers = 3;

    const r1 = partition.arriveAtSyncPoint("boss-fight", "p1", totalPlayers);
    expect(r1).toBe(false);

    const r2 = partition.arriveAtSyncPoint("boss-fight", "p2", totalPlayers);
    expect(r2).toBe(false);

    const r3 = partition.arriveAtSyncPoint("boss-fight", "p3", totalPlayers);
    expect(r3).toBe(true); // all arrived

    expect(partition.isSyncPointReached("boss-fight", totalPlayers)).toBe(true);
  });

  test("players arriving early wait", () => {
    const partition = new StatePartition();
    partition.registerSyncPoint("forest", "meeting-point");

    partition.arriveAtSyncPoint("meeting-point", "p1", 2);

    // Only 1 of 2 arrived — not yet reached
    expect(partition.isSyncPointReached("meeting-point", 2)).toBe(false);
    expect(partition.getSyncPointArrivals("meeting-point")).toEqual(["p1"]);
  });

  test("last player arriving triggers continuation", () => {
    const partition = new StatePartition();
    partition.registerSyncPoint("a", "sync");

    partition.arriveAtSyncPoint("sync", "p1", 2);
    const allArrived = partition.arriveAtSyncPoint("sync", "p2", 2);

    expect(allArrived).toBe(true);
  });

  test("sync point can be cleared and reused", () => {
    const partition = new StatePartition();
    partition.registerSyncPoint("a", "sync");

    partition.arriveAtSyncPoint("sync", "p1", 1);
    expect(partition.isSyncPointReached("sync", 1)).toBe(true);

    partition.clearSyncPoint("sync");
    expect(partition.isSyncPointReached("sync", 1)).toBe(false);
  });
});
