import { describe, test, expect } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import { KataSyncManager, MockTransport } from "@kata-framework/sync";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

function createSyncedPair() {
  const hostEngine = new KataEngine();
  const followerEngine = new KataEngine();

  // Register scenes on both engines
  const prologue = parseKata(readScene("prologue.kata"));
  const booth = parseKata(readScene("studio/booth.kata"));
  const shutdown = parseKata(readScene("endings/shutdown.kata"));

  hostEngine.registerScene(prologue);
  hostEngine.registerScene(booth);
  hostEngine.registerScene(shutdown);
  followerEngine.registerScene(prologue);
  followerEngine.registerScene(booth);
  followerEngine.registerScene(shutdown);

  const hostTransport = new MockTransport();
  const followerTransport = new MockTransport();
  MockTransport.link(hostTransport, followerTransport);

  const hostSync = new KataSyncManager(hostEngine, hostTransport);
  const followerSync = new KataSyncManager(followerEngine, followerTransport);

  return { hostEngine, followerEngine, hostSync, followerSync };
}

describe("multiplayer sync", () => {
  test("host connects and becomes authority", async () => {
    const { hostSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });

    expect(hostSync.playerId).toBe("host-1");
    expect(hostSync.isHost).toBe(true);
    expect(hostSync.connectionState).toBe("connected");
  });

  test("two players connect — first is authority", async () => {
    const { hostSync, followerSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });
    await followerSync.connect("test-room", { playerId: "follower-1" });

    expect(hostSync.isHost).toBe(true);
    expect(followerSync.isHost).toBe(false);
  });

  test("host can start scene and follower receives frame", async () => {
    const { hostSync, followerSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });
    await followerSync.connect("test-room", { playerId: "follower-1" });

    const followerFrames: any[] = [];
    followerSync.on("frame", (f: any) => followerFrames.push(f));

    hostSync.start("prologue");

    // Host starts engine, which emits update, which broadcasts to follower
    expect(followerFrames.length).toBeGreaterThan(0);
  });

  test("host advances and follower receives updated frame", async () => {
    const { hostSync, followerSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });
    await followerSync.connect("test-room", { playerId: "follower-1" });

    const followerFrames: any[] = [];
    followerSync.on("frame", (f: any) => followerFrames.push(f));

    hostSync.start("prologue");
    const initialCount = followerFrames.length;

    hostSync.next();
    expect(followerFrames.length).toBeGreaterThan(initialCount);
  });

  test("getPlayers returns connected players", async () => {
    const { hostSync, followerSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });
    await followerSync.connect("test-room", { playerId: "follower-1" });

    const hostPlayers = hostSync.getPlayers();
    expect(hostPlayers.length).toBeGreaterThanOrEqual(1);
    expect(hostPlayers.some((p: any) => p.id === "host-1")).toBe(true);
  });

  test("disconnect cleans up", async () => {
    const { hostSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });
    hostSync.disconnect();

    expect(hostSync.connectionState).toBe("disconnected");
  });

  test("setChoicePolicy can be called without error", async () => {
    const { hostSync } = createSyncedPair();

    await hostSync.connect("test-room", { playerId: "host-1" });

    // Should not throw
    hostSync.setChoicePolicy({ type: "first-writer" });
    hostSync.setChoicePolicy({ type: "designated", playerId: "host-1" });
  });

  test("multiplayer frontmatter in editorial-choice scene", () => {
    const source = readFileSync(
      join(scenesDir, "studio", "editorial-choice.kata"),
      "utf-8"
    );
    const scene = parseKata(source);

    expect(scene.meta.multiplayer).toBeDefined();
    expect(scene.meta.multiplayer?.choicePolicy).toBe("vote");
    expect(scene.meta.multiplayer?.syncPoint).toBe("editorial");
  });

  test("multiplayer frontmatter in first-broadcast scene", () => {
    const source = readFileSync(
      join(scenesDir, "studio", "first-broadcast.kata"),
      "utf-8"
    );
    const scene = parseKata(source);

    expect(scene.meta.multiplayer).toBeDefined();
    expect(scene.meta.multiplayer?.choicePolicy).toBe("first-writer");
  });
});
