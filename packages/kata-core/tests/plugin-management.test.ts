import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../types";

function makeScene(id: string): KSONScene {
  return {
    meta: { id },
    script: "",
    actions: [{ type: "text", speaker: "A", content: "hello" }],
  };
}

describe("Plugin Management", () => {
  test("getPlugins returns registered plugin names", () => {
    const engine = new KataEngine();
    engine.use({ name: "alpha" });
    engine.use({ name: "beta" });
    expect(engine.getPlugins()).toEqual(["alpha", "beta"]);
  });

  test("removePlugin stops hooks from firing", () => {
    const scene = makeScene("s1");
    const engine = new KataEngine();
    engine.registerScene(scene);

    let called = false;
    engine.use({
      name: "removable",
      beforeAction: (action) => {
        called = true;
        return action;
      },
    });

    engine.removePlugin("removable");
    engine.start("s1");

    expect(called).toBe(false);
    expect(engine.getPlugins()).toEqual([]);
  });

  test("duplicate plugin name throws", () => {
    const engine = new KataEngine();
    engine.use({ name: "dup" });
    expect(() => engine.use({ name: "dup" })).toThrow("already registered");
  });

  test("register after start works", () => {
    const scene = makeScene("s1");
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("s1");

    let called = false;
    engine.use({
      name: "late",
      afterAction: () => {
        called = true;
      },
    });

    // Advance to trigger the plugin
    // Need a second action — recreate scene with two actions
    const scene2: KSONScene = {
      meta: { id: "s2" },
      script: "",
      actions: [
        { type: "text", speaker: "A", content: "first" },
        { type: "text", speaker: "A", content: "second" },
      ],
    };
    engine.registerScene(scene2);
    engine.start("s2");

    expect(called).toBe(true);
  });
});
