import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { analyticsPlugin } from "../src/plugins/analytics";
import type { KSONScene } from "../src/types";

describe("Analytics insights", () => {
  test("identifies drop-off points (scenes ending without outbound choices)", () => {
    const scene: KSONScene = {
      meta: { id: "dead-end" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "The end." },
      ],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    engine.start("dead-end");
    engine.next(); // Triggers end (only 1 action)

    const report = analytics.getReport();
    expect(report.dropOffPoints).toContain("dead-end");
  });

  test("scenes with choices used are NOT drop-off points", () => {
    const scene1: KSONScene = {
      meta: { id: "hub" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "c_0", label: "Go", target: "next" }] },
      ],
    };
    const scene2: KSONScene = {
      meta: { id: "next" },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Done." }],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    engine.start("hub");
    engine.makeChoice("c_0");
    // "next" scene ends after start + next
    engine.next(); // Triggers end for "next" scene

    const report = analytics.getReport();
    expect(report.dropOffPoints).not.toContain("hub");
    expect(report.dropOffPoints).toContain("next");
  });

  test("identifies most popular choices", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "choice", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
      ],
    };

    const engine = new KataEngine();
    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.registerScene(scene);

    // Play three times, picking "a" twice and "b" once
    engine.start("s1");
    engine.makeChoice("a");
    engine.start("s1");
    engine.makeChoice("a");
    engine.start("s1");
    engine.makeChoice("b");

    const report = analytics.getReport();
    expect(report.choiceSelections["a"]).toBe(2);
    expect(report.choiceSelections["b"]).toBe(1);
  });

  test("averageActionsPerScene computes correctly across replays", () => {
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

    // Play twice
    engine.start("s1");
    engine.next(); // end (2 actions)

    engine.start("s1");
    engine.next(); // end (2 actions)

    const report = analytics.getReport();
    expect(report.averageActionsPerScene["s1"]).toBe(2);
  });
});
