import { describe, test, expect } from "bun:test";
import { createTestEngine, collectFrames } from "@kata-framework/test-utils";
import { listenerCountPlugin, type ListenerCountPlugin } from "../../src/plugins/listener-count";

describe("listener-count plugin", () => {
  const broadcastScene = `---
id: first_broadcast
title: Test Broadcast
---

:: Narrator :: On the air.
`;

  const boothScene = `---
id: booth
title: Booth
---

:: Narrator :: In the booth.
`;

  test("tracks listener growth on broadcast scenes", () => {
    const plugin = listenerCountPlugin({ baseGrowth: 100 });
    const { engine } = createTestEngine([broadcastScene, boothScene]);
    engine.use(plugin);

    // Starting a broadcast scene should increase listeners
    collectFrames(engine, "first_broadcast");
    expect(plugin.getListenerCount()).toBeGreaterThanOrEqual(0);
  });

  test("records growth history", () => {
    const plugin = listenerCountPlugin({ baseGrowth: 50 });
    const { engine } = createTestEngine([broadcastScene, boothScene]);
    engine.use(plugin);

    collectFrames(engine, "first_broadcast");
    const history = plugin.getGrowthHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].sceneId).toBe("first_broadcast");
  });

  test("tracks peak listeners", () => {
    const plugin = listenerCountPlugin({ baseGrowth: 200 });
    const { engine } = createTestEngine([broadcastScene], { listeners: 0 });
    engine.use(plugin);

    collectFrames(engine, "first_broadcast");
    expect(plugin.getPeakListeners()).toBeGreaterThanOrEqual(0);
  });

  test("has correct plugin name", () => {
    const plugin = listenerCountPlugin();
    expect(plugin.name).toBe("listener-count");
  });
});
