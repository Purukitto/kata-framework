import { describe, expect, test, afterEach } from "bun:test";
import { BroadcastChannelTransport } from "../src/transports/broadcast-channel";
import { createSyncEvent } from "../src/sync-event";
import type { ConnectionState } from "../src/types";

const transports: BroadcastChannelTransport[] = [];

afterEach(() => {
  for (const t of transports) {
    t.disconnect();
  }
  transports.length = 0;
});

function create() {
  const t = new BroadcastChannelTransport();
  transports.push(t);
  return t;
}

describe("BroadcastChannelTransport", () => {
  test("starts in disconnected state", () => {
    const t = create();
    expect(t.state).toBe("disconnected");
  });

  test("connect transitions to connected", async () => {
    const t = create();
    await t.connect("test-room");
    expect(t.state).toBe("connected");
  });

  test("two transports on the same roomId exchange messages", async () => {
    const t1 = create();
    const t2 = create();
    await t1.connect("room-a");
    await t2.connect("room-a");

    const received: any[] = [];
    t2.onReceive((e) => received.push(e));

    const event = createSyncEvent("start", { sceneId: "intro" }, "p1", 0);
    t1.send(event);

    // BroadcastChannel is async — give it a tick
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("start");
  });

  test("third transport also receives (multicast)", async () => {
    const t1 = create();
    const t2 = create();
    const t3 = create();
    await t1.connect("room-b");
    await t2.connect("room-b");
    await t3.connect("room-b");

    const r2: any[] = [];
    const r3: any[] = [];
    t2.onReceive((e) => r2.push(e));
    t3.onReceive((e) => r3.push(e));

    t1.send(createSyncEvent("next", null, "p1", 0));
    await new Promise((r) => setTimeout(r, 50));

    expect(r2).toHaveLength(1);
    expect(r3).toHaveLength(1);
  });

  test("disconnect stops receiving", async () => {
    const t1 = create();
    const t2 = create();
    await t1.connect("room-c");
    await t2.connect("room-c");

    const received: any[] = [];
    t2.onReceive((e) => received.push(e));

    t2.disconnect();
    t1.send(createSyncEvent("next", null, "p1", 0));
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(0);
  });

  test("different roomIds are isolated", async () => {
    const t1 = create();
    const t2 = create();
    await t1.connect("room-x");
    await t2.connect("room-y");

    const received: any[] = [];
    t2.onReceive((e) => received.push(e));

    t1.send(createSyncEvent("next", null, "p1", 0));
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(0);
  });

  test("onConnectionChange fires on state transitions", async () => {
    const t = create();
    const states: ConnectionState[] = [];
    t.onConnectionChange((s) => states.push(s));

    await t.connect("room-d");
    t.disconnect();

    expect(states).toEqual(["connected", "disconnected"]);
  });
});
