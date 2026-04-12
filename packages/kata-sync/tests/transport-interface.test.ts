import { describe, expect, test } from "bun:test";
import { MockTransport } from "../src/transports/mock";
import { createSyncEvent } from "../src/sync-event";
import type { ConnectionState } from "../src/types";

describe("MockTransport", () => {
  test("starts in disconnected state", () => {
    const transport = new MockTransport();
    expect(transport.state).toBe("disconnected");
  });

  test("connect transitions to connected state", async () => {
    const transport = new MockTransport();
    await transport.connect("room-1");
    expect(transport.state).toBe("connected");
  });

  test("disconnect transitions to disconnected state", async () => {
    const transport = new MockTransport();
    await transport.connect("room-1");
    transport.disconnect();
    expect(transport.state).toBe("disconnected");
  });

  test("send delivers to registered receive handlers", async () => {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    await t1.connect("room-1");
    await t2.connect("room-1");

    const received: any[] = [];
    t2.onReceive((event) => received.push(event));

    const event = createSyncEvent("start", { sceneId: "intro" }, "p1", 0);
    t1.send(event);

    expect(received).toHaveLength(1);
    expect(received[0]!.type).toBe("start");
    expect(received[0]!.playerId).toBe("p1");
  });

  test("send does not deliver to sender", async () => {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    await t1.connect("room-1");
    await t2.connect("room-1");

    const selfReceived: any[] = [];
    t1.onReceive((event) => selfReceived.push(event));

    const event = createSyncEvent("next", null, "p1", 0);
    t1.send(event);

    expect(selfReceived).toHaveLength(0);
  });

  test("offReceive unsubscribes a handler", async () => {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    await t1.connect("room-1");
    await t2.connect("room-1");

    const received: any[] = [];
    const handler = (event: any) => received.push(event);
    t2.onReceive(handler);

    t1.send(createSyncEvent("next", null, "p1", 0));
    expect(received).toHaveLength(1);

    t2.offReceive(handler);
    t1.send(createSyncEvent("next", null, "p1", 1));
    expect(received).toHaveLength(1); // no new messages
  });

  test("disconnect stops delivery", async () => {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    MockTransport.link(t1, t2);

    await t1.connect("room-1");
    await t2.connect("room-1");

    const received: any[] = [];
    t2.onReceive((event) => received.push(event));

    t2.disconnect();
    t1.send(createSyncEvent("next", null, "p1", 0));
    expect(received).toHaveLength(0);
  });

  test("onConnectionChange fires on state transitions", async () => {
    const transport = new MockTransport();
    const states: ConnectionState[] = [];
    transport.onConnectionChange((s) => states.push(s));

    await transport.connect("room-1");
    transport.disconnect();

    expect(states).toEqual(["connected", "disconnected"]);
  });

  test("multiple transports receive broadcasts", async () => {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    const t3 = new MockTransport();
    MockTransport.link(t1, t2, t3);

    await t1.connect("room-1");
    await t2.connect("room-1");
    await t3.connect("room-1");

    const r2: any[] = [];
    const r3: any[] = [];
    t2.onReceive((e) => r2.push(e));
    t3.onReceive((e) => r3.push(e));

    t1.send(createSyncEvent("start", null, "p1", 0));

    expect(r2).toHaveLength(1);
    expect(r3).toHaveLength(1);
  });
});
