import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { analyticsPlugin } from "../src/plugins/analytics";
import type { AnalyticsPlugin } from "../src/plugins/analytics";
import type { KSONScene } from "../src/types";

describe("Analytics tracking", () => {
  test("records scene visit counts", () => {
    const scene1: KSONScene = {
      meta: { id: "intro" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Go", target: "shop" }] },
      ],
    };
    const scene2: KSONScene = {
      meta: { id: "shop" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Welcome to shop." }],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    engine.start("intro");
    engine.makeChoice("c_0"); // Go to shop

    const report = analytics.getReport();
    expect(report.sceneVisits["intro"]).toBe(1);
    expect(report.sceneVisits["shop"]).toBe(1);
  });

  test("records choice selection counts", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "buy", label: "Buy" }, { id: "sell", label: "Sell" }] },
      ],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");
    engine.makeChoice("buy");

    const report = analytics.getReport();
    expect(report.choiceSelections["buy"]).toBe(1);
    expect(report.choiceSelections["sell"]).toBeUndefined();
  });

  test("records actions-per-scene", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "One" },
        { type: "text", speaker: "N", content: "Two" },
      ],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");    // at index 0, emits frame
    engine.next();         // at index 1, emits frame
    engine.next();         // at index 1, triggers end

    const report = analytics.getReport();
    expect(report.averageActionsPerScene["s1"]).toBe(2);
  });

  test("tracks session duration", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Hello" }],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("s1");

    const report = analytics.getReport();
    expect(report.sessionDuration).toBeGreaterThanOrEqual(0);
    expect(typeof report.sessionDuration).toBe("number");
  });

  test("handles multiple visits to same scene", () => {
    const scene1: KSONScene = {
      meta: { id: "hub" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Explore", target: "area" }] },
      ],
    };
    const scene2: KSONScene = {
      meta: { id: "area" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Return", target: "hub" }] },
      ],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    engine.start("hub");
    engine.makeChoice("c_0"); // hub → area
    engine.makeChoice("c_0"); // area → hub
    engine.makeChoice("c_0"); // hub → area again

    const report = analytics.getReport();
    expect(report.sceneVisits["hub"]).toBe(2);
    expect(report.sceneVisits["area"]).toBe(2);
  });
});
