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
    JSON.stringify({
      type,
      payload,
      playerId,
      seq: 1,
      timestamp: Date.now(),
    }),
  );
}

describe("WebSocket Transport", () => {
  test("client connects and receives ack (snapshot-response)", async () => {
    server = new KataServer({ port: 0, roomTimeout: 1000 });
    server.start();

    const received: SyncEvent[] = [];
    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.onmessage = (e) => {
          received.push(JSON.parse(e.data as string));
        };
        sendJoin(ws, "ws-test", "p1");
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(received.length).toBeGreaterThanOrEqual(1);
    const ack = received.find((e) => e.type === "snapshot-response");
    expect(ack).toBeTruthy();

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  test("messages relay to all same-room clients", async () => {
    server = new KataServer({ port: 0, roomTimeout: 1000 });
    server.start();

    const scenes = [
      {
        meta: { id: "intro" },
        script: "",
        actions: [
          { type: "text", speaker: "N", content: "Hello" },
          { type: "text", speaker: "N", content: "World" },
        ],
      },
    ];

    const r1: SyncEvent[] = [];
    const r2: SyncEvent[] = [];

    const ws1 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws1.onopen = () => {
        ws1.onmessage = (e) => r1.push(JSON.parse(e.data as string));
        sendJoin(ws1, "relay-room", "p1", scenes);
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    const ws2 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws2.onopen = () => {
        ws2.onmessage = (e) => r2.push(JSON.parse(e.data as string));
        sendJoin(ws2, "relay-room", "p2");
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    // p1 sends start intent
    sendIntent(ws1, "start", { sceneId: "intro" }, "p1");
    await new Promise((r) => setTimeout(r, 50));

    // Both should receive the snapshot (frame) from the server engine
    const p1Frames = r1.filter((e) => e.type === "snapshot" && (e.payload as any).frame);
    const p2Frames = r2.filter((e) => e.type === "snapshot" && (e.payload as any).frame);
    expect(p1Frames.length).toBeGreaterThanOrEqual(1);
    expect(p2Frames.length).toBeGreaterThanOrEqual(1);

    ws1.close();
    ws2.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  test("rooms are isolated", async () => {
    server = new KataServer({ port: 0, roomTimeout: 1000 });
    server.start();

    const scenes = [
      { meta: { id: "intro" }, script: "", actions: [{ type: "text", speaker: "N", content: "Hi" }] },
    ];

    const r2: SyncEvent[] = [];

    const ws1 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws1.onopen = () => {
        sendJoin(ws1, "room-A", "p1", scenes);
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    const ws2 = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws2.onopen = () => {
        ws2.onmessage = (e) => r2.push(JSON.parse(e.data as string));
        sendJoin(ws2, "room-B", "p2", scenes);
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    // Clear r2 of join events
    const beforeCount = r2.length;

    // Start in room-A
    sendIntent(ws1, "start", { sceneId: "intro" }, "p1");
    await new Promise((r) => setTimeout(r, 50));

    // room-B should NOT get room-A's frames
    const afterCount = r2.filter((e) => e.type === "snapshot" && (e.payload as any).frame).length;
    expect(afterCount).toBe(0);

    ws1.close();
    ws2.close();
    await new Promise((r) => setTimeout(r, 50));
  });
});
