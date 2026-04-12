import { describe, expect, test } from "bun:test";
import { createSyncEvent } from "../src/sync-event";
import type { SyncEvent } from "../src/types";

describe("SyncEvent", () => {
  test("createSyncEvent includes all required fields", () => {
    const event = createSyncEvent("start", { sceneId: "intro" }, "player-1", 0);
    expect(event.type).toBe("start");
    expect(event.payload).toEqual({ sceneId: "intro" });
    expect(event.playerId).toBe("player-1");
    expect(event.seq).toBe(0);
    expect(typeof event.timestamp).toBe("number");
    expect(event.timestamp).toBeGreaterThan(0);
  });

  test("sequence numbers are set from the argument", () => {
    const e1 = createSyncEvent("next", null, "p1", 0);
    const e2 = createSyncEvent("next", null, "p1", 1);
    const e3 = createSyncEvent("choice", { choiceId: "a" }, "p1", 2);
    expect(e1.seq).toBe(0);
    expect(e2.seq).toBe(1);
    expect(e3.seq).toBe(2);
  });

  test("events are JSON-serializable (round-trip)", () => {
    const event = createSyncEvent("choice", { choiceId: "buy-sword" }, "player-2", 5);
    const json = JSON.stringify(event);
    const parsed = JSON.parse(json) as SyncEvent;
    expect(parsed.type).toBe(event.type);
    expect(parsed.payload).toEqual(event.payload);
    expect(parsed.playerId).toBe(event.playerId);
    expect(parsed.seq).toBe(event.seq);
    expect(parsed.timestamp).toBe(event.timestamp);
  });

  test("timestamps are close to Date.now()", () => {
    const before = Date.now();
    const event = createSyncEvent("start", null, "p1", 0);
    const after = Date.now();
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
  });
});
