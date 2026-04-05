import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { analyticsPlugin } from "../src/plugins/analytics";
import type { KSONScene } from "../src/types";

describe("Analytics export", () => {
  const scene: KSONScene = {
    meta: { id: "s1" },
    script: "",
    actions: [
      { type: "text", speaker: "N", content: "Hello" },
      { type: "text", speaker: "N", content: "World" },
    ],
  };

  test("toJSON() returns a serializable object", () => {
    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");
    engine.next();

    const json = analytics.toJSON();
    // Should be serializable
    const serialized = JSON.stringify(json);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.sceneVisits).toBeDefined();
    expect(deserialized.choiceSelections).toBeDefined();
    expect(deserialized.averageActionsPerScene).toBeDefined();
    expect(deserialized.dropOffPoints).toBeDefined();
    expect(deserialized.sessionDuration).toBeDefined();
  });

  test("reset() clears all data", () => {
    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");
    engine.next();

    let report = analytics.getReport();
    expect(report.sceneVisits["s1"]).toBe(1);

    analytics.reset();

    report = analytics.getReport();
    expect(Object.keys(report.sceneVisits)).toHaveLength(0);
    expect(Object.keys(report.choiceSelections)).toHaveLength(0);
    expect(Object.keys(report.averageActionsPerScene)).toHaveLength(0);
    expect(report.dropOffPoints).toHaveLength(0);
  });

  test("report matches expected shape", () => {
    const analytics = analyticsPlugin();
    const report = analytics.getReport();

    expect(report).toHaveProperty("sceneVisits");
    expect(report).toHaveProperty("choiceSelections");
    expect(report).toHaveProperty("averageActionsPerScene");
    expect(report).toHaveProperty("dropOffPoints");
    expect(report).toHaveProperty("sessionDuration");
    expect(Array.isArray(report.dropOffPoints)).toBe(true);
    expect(typeof report.sessionDuration).toBe("number");
  });
});
