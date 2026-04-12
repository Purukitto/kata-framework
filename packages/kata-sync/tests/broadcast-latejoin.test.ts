import { describe, expect, test, afterEach } from "bun:test";
import { KataEngine } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";
import { KataSyncManager } from "../src/sync-manager";
import { BroadcastChannelTransport } from "../src/transports/broadcast-channel";

const managers: KataSyncManager[] = [];

afterEach(() => {
  for (const m of managers) {
    m.disconnect();
  }
  managers.length = 0;
});

function makeScene(id: string, actions: any[]) {
  return { meta: { id }, script: "", actions };
}

function createManager() {
  const scene = makeScene("intro", [
    { type: "text", speaker: "Narrator", content: "Hello" },
    { type: "text", speaker: "Narrator", content: "World" },
    { type: "text", speaker: "Narrator", content: "Goodbye" },
  ]);
  const engine = new KataEngine();
  engine.registerScene(scene);
  const transport = new BroadcastChannelTransport();
  const manager = new KataSyncManager(engine, transport);
  managers.push(manager);
  return manager;
}

describe("BroadcastChannel Late Join", () => {
  test("late joiner receives state snapshot", async () => {
    const host = createManager();
    await host.connect("bc-late-1", { playerId: "host" });
    await new Promise((r) => setTimeout(r, 20));

    // Host advances several actions
    host.start("intro");
    host.next(); // -> "World"
    await new Promise((r) => setTimeout(r, 20));

    // Late joiner connects
    const lateJoiner = createManager();
    await lateJoiner.connect("bc-late-1", { playerId: "late" });
    await new Promise((r) => setTimeout(r, 100));

    // The late joiner's engine should have the snapshot loaded
    const snapshot = lateJoiner.getSnapshot();
    expect(snapshot.currentSceneId).toBe("intro");
    expect(snapshot.currentActionIndex).toBe(1); // start() emits action 0, next() advances to action 1
  });
});
