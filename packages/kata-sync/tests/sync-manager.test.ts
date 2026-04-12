import { describe, expect, test } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";
import { KataSyncManager } from "../src/sync-manager";
import { MockTransport } from "../src/transports/mock";

function makeScene(id: string, actions: any[]) {
  return { meta: { id }, script: "", actions };
}

function setupPair() {
  const scene = makeScene("intro", [
    { type: "text", speaker: "Narrator", content: "Hello" },
    { type: "text", speaker: "Narrator", content: "World" },
    {
      type: "choice",
      choices: [
        { id: "a", label: "Option A", target: "scene-a" },
        { id: "b", label: "Option B" },
      ],
    },
  ]);
  const sceneA = makeScene("scene-a", [
    { type: "text", speaker: "Narrator", content: "You chose A" },
  ]);

  const hostEngine = new KataEngine();
  hostEngine.registerScene(scene);
  hostEngine.registerScene(sceneA);

  const followerEngine = new KataEngine();
  followerEngine.registerScene(scene);
  followerEngine.registerScene(sceneA);

  const hostTransport = new MockTransport();
  const followerTransport = new MockTransport();
  MockTransport.link(hostTransport, followerTransport);

  const host = new KataSyncManager(hostEngine, hostTransport);
  const follower = new KataSyncManager(followerEngine, followerTransport);

  return { host, follower, hostEngine, followerEngine, hostTransport, followerTransport };
}

describe("KataSyncManager", () => {
  test("first connector becomes authority", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    expect(host.isHost).toBe(true);
    expect(follower.isHost).toBe(false);
  });

  test("start() on authority calls engine and broadcasts frame", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (frame: KSONFrame) => followerFrames.push(frame));

    host.start("intro");

    expect(followerFrames).toHaveLength(1);
    expect(followerFrames[0]!.action.type).toBe("text");
    expect((followerFrames[0]!.action as any).content).toBe("Hello");
  });

  test("next() on authority broadcasts next frame", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (frame: KSONFrame) => followerFrames.push(frame));

    host.start("intro");
    host.next();

    expect(followerFrames).toHaveLength(2);
    expect((followerFrames[1]!.action as any).content).toBe("World");
  });

  test("makeChoice() on authority broadcasts result", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (frame: KSONFrame) => followerFrames.push(frame));

    host.start("intro");
    host.next(); // -> "World"
    host.next(); // -> choice
    host.makeChoice("a"); // -> scene-a

    // Should have received frames including the scene-a frame
    const lastFrame = followerFrames[followerFrames.length - 1]!;
    expect((lastFrame.action as any).content).toBe("You chose A");
  });

  test("follower start() sends intent to authority", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const hostFrames: KSONFrame[] = [];
    host.on("frame", (frame: KSONFrame) => hostFrames.push(frame));

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (frame: KSONFrame) => followerFrames.push(frame));

    // Follower requests start — host processes it
    follower.start("intro");

    // Both should have the frame
    expect(hostFrames).toHaveLength(1);
    expect(followerFrames).toHaveLength(1);
  });

  test("follower next() sends intent to authority", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const followerFrames: KSONFrame[] = [];
    follower.on("frame", (frame: KSONFrame) => followerFrames.push(frame));

    host.start("intro");
    follower.next(); // follower sends intent, host processes

    expect(followerFrames).toHaveLength(2);
    expect((followerFrames[1]!.action as any).content).toBe("World");
  });

  test("connect generates playerId if not provided", async () => {
    const engine = new KataEngine();
    const transport = new MockTransport();
    const manager = new KataSyncManager(engine, transport);
    await manager.connect("room-1");

    expect(manager.playerId).toBeTruthy();
    expect(typeof manager.playerId).toBe("string");
    expect(manager.playerId.length).toBeGreaterThan(0);
  });

  test("disconnect cleans up", async () => {
    const { host } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    expect(host.connectionState).toBe("connected");

    host.disconnect();
    expect(host.connectionState).toBe("disconnected");
  });

  test("getPlayers returns current roster", async () => {
    const { host, follower } = setupPair();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const players = host.getPlayers();
    expect(players).toHaveLength(2);
    expect(players.find((p) => p.id === "host")!.role).toBe("authority");
    expect(players.find((p) => p.id === "follower")!.role).toBe("player");
  });
});
