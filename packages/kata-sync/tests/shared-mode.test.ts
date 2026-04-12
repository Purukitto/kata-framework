import { describe, expect, test } from "bun:test";
import { KataEngine } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";
import { KataSyncManager } from "../src/sync-manager";
import { MockTransport } from "../src/transports/mock";

function makeScene(id: string, actions: any[]) {
  return { meta: { id }, script: "", actions };
}

function setupSharedPair() {
  const scene = makeScene("intro", [
    { type: "text", speaker: "N", content: "Hello" },
    { type: "text", speaker: "N", content: "World" },
    { type: "exec", code: "ctx.visited = true" },
    { type: "text", speaker: "N", content: "Done" },
  ]);

  const e1 = new KataEngine();
  const e2 = new KataEngine();
  e1.registerScene(scene);
  e2.registerScene(scene);

  const t1 = new MockTransport();
  const t2 = new MockTransport();
  MockTransport.link(t1, t2);

  return {
    host: new KataSyncManager(e1, t1),
    follower: new KataSyncManager(e2, t2),
  };
}

describe("Shared Mode", () => {
  test("all players see the same scene and action index", async () => {
    const { host, follower } = setupSharedPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const hostFrames: KSONFrame[] = [];
    const followerFrames: KSONFrame[] = [];
    host.on("frame", (f: KSONFrame) => hostFrames.push(f));
    follower.on("frame", (f: KSONFrame) => followerFrames.push(f));

    host.start("intro");
    host.next();

    // Both see the same frames
    expect(hostFrames).toHaveLength(2);
    expect(followerFrames).toHaveLength(2);
    expect((hostFrames[1]!.action as any).content).toBe("World");
    expect((followerFrames[1]!.action as any).content).toBe("World");
  });

  test("ctx from frame state is forwarded to follower", async () => {
    const { host, follower } = setupSharedPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (f: KSONFrame) => followerFrames.push(f));

    host.start("intro");
    host.next(); // "World"

    // The follower receives the frame with state including currentSceneId
    const lastFrame = followerFrames[followerFrames.length - 1]!;
    expect(lastFrame.state.currentSceneId).toBe("intro");
    expect(lastFrame.state.currentActionIndex).toBe(1);
  });

  test("one player's choice advances everyone", async () => {
    const scene = makeScene("intro", [
      { type: "text", speaker: "N", content: "Pick" },
      {
        type: "choice",
        choices: [
          { id: "a", label: "A", target: "end-scene" },
        ],
      },
    ]);
    const endScene = makeScene("end-scene", [
      { type: "text", speaker: "N", content: "End" },
    ]);

    const e1 = new KataEngine();
    const e2 = new KataEngine();
    e1.registerScene(scene);
    e1.registerScene(endScene);
    e2.registerScene(scene);
    e2.registerScene(endScene);

    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    const host = new KataSyncManager(e1, t1);
    const follower = new KataSyncManager(e2, t2);

    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (f: KSONFrame) => followerFrames.push(f));

    host.start("intro");
    host.next(); // choice
    host.makeChoice("a"); // -> end-scene

    const lastFrame = followerFrames[followerFrames.length - 1]!;
    expect((lastFrame.action as any).content).toBe("End");
  });
});
