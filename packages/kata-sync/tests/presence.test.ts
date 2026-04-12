import { describe, expect, test } from "bun:test";
import { KataEngine } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";
import { KataSyncManager } from "../src/sync-manager";
import { MockTransport } from "../src/transports/mock";

function makeScene(id: string, actions: any[]) {
  return { meta: { id }, script: "", actions };
}

function setupTriple() {
  const scene = makeScene("intro", [
    { type: "text", speaker: "Narrator", content: "Hello" },
    {
      type: "choice",
      choices: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    },
  ]);

  const engines = [new KataEngine(), new KataEngine(), new KataEngine()];
  const transports = [new MockTransport(), new MockTransport(), new MockTransport()];
  MockTransport.link(...transports);

  for (const e of engines) e.registerScene(scene);

  const managers = engines.map((e, i) => new KataSyncManager(e, transports[i]!));
  return managers as [KataSyncManager, KataSyncManager, KataSyncManager];
}

describe("Presence", () => {
  test("player-joined event fires on connect", async () => {
    const [host, follower] = setupTriple();
    await host.connect("room-1", { playerId: "host" });

    const joined: any[] = [];
    host.on("player-joined", (info: any) => joined.push(info));

    await follower.connect("room-1", { playerId: "follower" });

    expect(joined).toHaveLength(1);
    expect(joined[0].id).toBe("follower");
  });

  test("player-left event fires on disconnect", async () => {
    const [host, follower] = setupTriple();
    await host.connect("room-1", { playerId: "host" });
    await follower.connect("room-1", { playerId: "follower" });

    const left: any[] = [];
    host.on("player-left", (info: any) => left.push(info));

    follower.disconnect();

    expect(left).toHaveLength(1);
    expect(left[0].id).toBe("follower");
  });

  test("getPlayers returns accurate roster", async () => {
    const [host, p2, p3] = setupTriple();
    await host.connect("room-1", { playerId: "host" });
    await p2.connect("room-1", { playerId: "p2" });
    await p3.connect("room-1", { playerId: "p3" });

    const hostPlayers = host.getPlayers();
    expect(hostPlayers).toHaveLength(3);
    expect(hostPlayers.map((p) => p.id).sort()).toEqual(["host", "p2", "p3"]);
  });

  test("spectator receives frames but makeChoice is a no-op intent", async () => {
    const scene = makeScene("intro", [
      { type: "text", speaker: "Narrator", content: "Hello" },
      {
        type: "choice",
        choices: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      },
    ]);

    const hostEngine = new KataEngine();
    hostEngine.registerScene(scene);
    const specEngine = new KataEngine();
    specEngine.registerScene(scene);

    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    const host = new KataSyncManager(hostEngine, t1);
    const spectator = new KataSyncManager(specEngine, t2);

    await host.connect("room-1", { playerId: "host" });
    await spectator.connect("room-1", { playerId: "spec", role: "spectator" });

    const specFrames: KSONFrame[] = [];
    spectator.on("frame", (f: KSONFrame) => specFrames.push(f));

    host.start("intro");

    expect(specFrames).toHaveLength(1);
    expect((specFrames[0]!.action as any).content).toBe("Hello");

    // Spectator's role in roster
    const players = host.getPlayers();
    const specInfo = players.find((p) => p.id === "spec");
    expect(specInfo!.role).toBe("spectator");
  });
});
