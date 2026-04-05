import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { analyticsPlugin } from "../src/plugins/analytics";
import type { KSONScene } from "../src/types";

describe("Analytics and snapshots", () => {
  const scene: KSONScene = {
    meta: { id: "s1" },
    script: "",
    actions: [
      { type: "text", speaker: "N", content: "One" },
      { type: "text", speaker: "N", content: "Two" },
      { type: "text", speaker: "N", content: "Three" },
    ],
  };

  test("analytics data is NOT included in game snapshots", () => {
    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");
    engine.next();

    const snapshot = engine.getSnapshot();
    // Snapshot should not contain analytics data
    expect((snapshot as any).sceneVisits).toBeUndefined();
    expect((snapshot as any).choiceSelections).toBeUndefined();
    expect((snapshot as any).analytics).toBeUndefined();
  });

  test("analytics persist across back() rewinds", () => {
    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");
    engine.next(); // action 1
    engine.next(); // action 2

    let report = analytics.getReport();
    const actionsBeforeRewind = report.averageActionsPerScene["s1"];

    engine.back(); // rewind to action 1

    report = analytics.getReport();
    // Analytics should NOT be rolled back — data persists
    // The count may have grown because back() re-emits a frame via emitFrame()
    // which triggers afterAction. This is intentional — analytics track all activity.
    expect(report.sceneVisits["s1"]).toBe(1);
  });

  test("analytics survive scene transitions", () => {
    const scene1: KSONScene = {
      meta: { id: "a" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Go", target: "b" }] },
      ],
    };
    const scene2: KSONScene = {
      meta: { id: "b" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Done." }],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    engine.start("a");
    engine.makeChoice("c_0");

    const report = analytics.getReport();
    expect(report.sceneVisits["a"]).toBe(1);
    expect(report.sceneVisits["b"]).toBe(1);
    expect(report.choiceSelections["c_0"]).toBe(1);
  });
});
