import { describe, expect, test, afterEach } from "bun:test";
import { KataServer } from "../src/server/index";
import type { SyncEvent } from "../src/types";

let server: KataServer | null = null;

afterEach(() => {
  if (server) {
    server.stop();
    server = null;
  }
});

function sendJoin(ws: WebSocket, roomId: string, playerId: string, scenes?: any[]) {
  ws.send(
    JSON.stringify({
      type: "player-joined",
      payload: { roomId, playerId, scenes },
      playerId,
      seq: 0,
      timestamp: Date.now(),
    }),
  );
}

function sendIntent(ws: WebSocket, type: string, payload: any, playerId: string) {
  ws.send(
    JSON.stringify({ type, payload, playerId, seq: 1, timestamp: Date.now() }),
  );
}

describe("WebSocket Late Join", () => {
  test("new player receives state snapshot on connect", async () => {
    server = new KataServer({ port: 0, roomTimeout: 1000 });
    server.start();

    const scenes = [
      {
        meta: { id: "intro" },
        script: "",
        actions: [
          { type: "text", speaker: "N", content: "Hello" },
          { type: "text", speaker: "N", content: "World" },
          { type: "text", speaker: "N", content: "Goodbye" },
        ],
      },
    ];

    // First player joins and advances
    const ws1 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws1.onopen = () => {
        sendJoin(ws1, "late-room", "p1", scenes);
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    sendIntent(ws1, "start", { sceneId: "intro" }, "p1");
    await new Promise((r) => setTimeout(r, 50));
    sendIntent(ws1, "next", null, "p1");
    await new Promise((r) => setTimeout(r, 50));

    // Late joiner connects
    const r2: SyncEvent[] = [];
    const ws2 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws2.onopen = () => {
        ws2.onmessage = (e) => r2.push(JSON.parse(e.data as string));
        sendJoin(ws2, "late-room", "p2");
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 100));

    // Late joiner should receive a snapshot-response with current state
    const snapshotResponse = r2.find((e) => e.type === "snapshot-response");
    expect(snapshotResponse).toBeTruthy();

    const payload = snapshotResponse!.payload as any;
    expect(payload.snapshot).toBeTruthy();
    expect(payload.snapshot.currentSceneId).toBe("intro");
    expect(payload.snapshot.currentActionIndex).toBe(1);

    ws1.close();
    ws2.close();
    await new Promise((r) => setTimeout(r, 50));
  });
});
