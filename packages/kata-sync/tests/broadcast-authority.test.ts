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
  ]);
  const engine = new KataEngine();
  engine.registerScene(scene);
  const transport = new BroadcastChannelTransport();
  const manager = new KataSyncManager(engine, transport);
  managers.push(manager);
  return manager;
}

describe("BroadcastChannel Authority", () => {
  test("first connection becomes authority", async () => {
    const host = createManager();
    const follower = createManager();

    await host.connect("bc-auth-1", { playerId: "host" });
    // small delay to let player-joined propagate
    await new Promise((r) => setTimeout(r, 20));
    await follower.connect("bc-auth-1", { playerId: "follower" });
    await new Promise((r) => setTimeout(r, 50));

    expect(host.isHost).toBe(true);
    expect(follower.isHost).toBe(false);
  });

  test("authority actions are reflected on follower", async () => {
    const host = createManager();
    const follower = createManager();

    await host.connect("bc-auth-2", { playerId: "host" });
    await new Promise((r) => setTimeout(r, 20));
    await follower.connect("bc-auth-2", { playerId: "follower" });
    await new Promise((r) => setTimeout(r, 50));

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (f: KSONFrame) => followerFrames.push(f));

    host.start("intro");
    await new Promise((r) => setTimeout(r, 50));

    expect(followerFrames).toHaveLength(1);
    expect((followerFrames[0]!.action as any).content).toBe("Hello");

    host.next();
    await new Promise((r) => setTimeout(r, 50));

    expect(followerFrames).toHaveLength(2);
    expect((followerFrames[1]!.action as any).content).toBe("World");
  });
});
