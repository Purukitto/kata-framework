import { describe, expect, test, afterEach } from "bun:test";
import { KataServer } from "../src/server/index";

let server: KataServer | null = null;

afterEach(() => {
  if (server) {
    server.stop();
    server = null;
  }
});

describe("KataServer Rooms", () => {
  test("creating a room emits room-created event", async () => {
    server = new KataServer({ port: 0, roomTimeout: 100 });
    server.start();

    const events: string[] = [];
    server.on("room-created", (roomId: string) => events.push(roomId));

    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "player-joined",
            payload: {
              roomId: "test-room",
              playerId: "p1",
              scenes: [{ meta: { id: "intro" }, script: "", actions: [{ type: "text", speaker: "N", content: "Hi" }] }],
            },
            playerId: "p1",
            seq: 0,
            timestamp: Date.now(),
          }),
        );
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toContain("test-room");
    expect(server.getRoomIds()).toContain("test-room");

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  test("players can join and leave rooms", async () => {
    server = new KataServer({ port: 0, roomTimeout: 100 });
    server.start();

    const joined: string[] = [];
    const left: string[] = [];
    server.on("player-joined", (_roomId: string, pid: string) => joined.push(pid));
    server.on("player-left", (_roomId: string, pid: string) => left.push(pid));

    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "player-joined",
            payload: { roomId: "join-leave", playerId: "p1" },
            playerId: "p1",
            seq: 0,
            timestamp: Date.now(),
          }),
        );
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(joined).toContain("p1");

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(left).toContain("p1");
  });

  test("empty rooms are cleaned up after timeout", async () => {
    server = new KataServer({ port: 0, roomTimeout: 100 });
    server.start();

    const closed: string[] = [];
    server.on("room-closed", (rid: string) => closed.push(rid));

    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "player-joined",
            payload: { roomId: "cleanup-room", playerId: "p1" },
            playerId: "p1",
            seq: 0,
            timestamp: Date.now(),
          }),
        );
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(server.getRoomIds()).toContain("cleanup-room");

    ws.close();
    await new Promise((r) => setTimeout(r, 200)); // wait for roomTimeout

    expect(closed).toContain("cleanup-room");
    expect(server.getRoomIds()).not.toContain("cleanup-room");
  });
});
