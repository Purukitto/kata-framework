import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Plugin Lifecycle", () => {
  test("beforeAction is called before update event", () => {
    const order: string[] = [];
    const scene = makeScene("s1", [{ type: "text", speaker: "A", content: "hello" }]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.use({
      name: "tracker",
      beforeAction: (action, ctx) => {
        order.push("beforeAction");
        return action;
      },
    });

    engine.on("update", () => order.push("update"));
    engine.start("s1");

    expect(order).toEqual(["beforeAction", "update"]);
  });

  test("afterAction is called after update event", () => {
    const order: string[] = [];
    const scene = makeScene("s1", [{ type: "text", speaker: "A", content: "hello" }]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.use({
      name: "tracker",
      afterAction: () => order.push("afterAction"),
    });

    engine.on("update", () => order.push("update"));
    engine.start("s1");

    expect(order).toEqual(["update", "afterAction"]);
  });

  test("beforeAction returning null skips the frame", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "skip me" },
      { type: "text", speaker: "B", content: "show me" },
    ]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.use({
      name: "filter",
      beforeAction: (action) => {
        if (action.type === "text" && action.speaker === "A") return null;
        return action;
      },
    });

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    // First frame was skipped
    expect(frames).toHaveLength(0);
  });

  test("beforeAction can mutate the action", () => {
    const scene = makeScene("s1", [{ type: "text", speaker: "A", content: "original" }]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.use({
      name: "mutator",
      beforeAction: (action) => {
        if (action.type === "text") {
          return { ...action, content: "modified" };
        }
        return action;
      },
    });

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    expect(frames[0].action.content).toBe("modified");
  });

  test("onChoice fires on makeChoice", () => {
    const scene = makeScene("s1", [
      { type: "choice", choices: [{ id: "c1", label: "Go" }] },
      { type: "text", speaker: "A", content: "after" },
    ]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    let choiceReceived: any = null;
    engine.use({
      name: "choiceTracker",
      onChoice: (choice) => {
        choiceReceived = choice;
      },
    });

    engine.start("s1");
    engine.makeChoice("c1");

    expect(choiceReceived).toBeDefined();
    expect(choiceReceived.id).toBe("c1");
  });

  test("beforeSceneChange fires on scene transitions", () => {
    const scene1 = makeScene("s1", [
      { type: "choice", choices: [{ id: "c1", label: "Go", target: "s2" }] },
    ]);
    const scene2 = makeScene("s2", [{ type: "text", speaker: "B", content: "arrived" }]);

    const engine = new KataEngine();
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    const transitions: any[] = [];
    engine.use({
      name: "sceneTracker",
      beforeSceneChange: (fromId, toId) => {
        transitions.push({ fromId, toId });
      },
    });

    engine.start("s1");
    engine.makeChoice("c1");

    // First transition: null → s1 (but only if engine was already started, which it wasn't)
    // Second: s1 → s2 via choice target
    expect(transitions.some((t) => t.fromId === "s1" && t.toId === "s2")).toBe(true);
  });

  test("plugins execute in registration order", () => {
    const order: string[] = [];
    const scene = makeScene("s1", [{ type: "text", speaker: "A", content: "hi" }]);
    const engine = new KataEngine();
    engine.registerScene(scene);

    engine.use({
      name: "first",
      beforeAction: () => {
        order.push("first");
        return null; // will skip frame but that's ok for ordering test
      },
    });
    engine.use({
      name: "second",
      beforeAction: (action) => {
        order.push("second");
        return action;
      },
    });

    engine.start("s1");

    // "first" returns null so "second" is never reached
    expect(order).toEqual(["first"]);
  });
});
