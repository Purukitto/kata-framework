import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KataPlugin } from "../src/runtime/plugin";
import type { KSONScene, KSONAction, KSONFrame } from "../src/types";

/**
 * This test validates the code examples from docs/plugins.md.
 * If these tests fail, the guide's code samples are inaccurate.
 */

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("plugin guide examples", () => {
  test("Quick Start example — minimal logger plugin", () => {
    // Copied from the guide's Quick Start section
    const logged: string[] = [];
    const myPlugin: KataPlugin = {
      name: "my-plugin",
      beforeAction(action, ctx) {
        logged.push(action.type);
        return action;
      },
    };

    const engine = new KataEngine();
    engine.use(myPlugin);

    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    engine.registerScene(scene);
    engine.start("s1");

    expect(logged).toEqual(["text"]);
  });

  test("closure state pattern — factory with getData/reset", () => {
    // Pattern from the State Management section
    interface MyPlugin extends KataPlugin {
      getData(): string[];
      reset(): void;
    }

    function myPlugin(): MyPlugin {
      const data: string[] = [];
      return {
        name: "my-plugin",
        afterAction(action, ctx) {
          data.push(action.type);
        },
        getData() { return [...data]; },
        reset() { data.length = 0; },
      };
    }

    const plugin = myPlugin();
    const engine = new KataEngine();
    engine.use(plugin);

    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Line 1" },
      { type: "text", speaker: "B", content: "Line 2" },
    ]);
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();

    expect(plugin.getData()).toEqual(["text", "text"]);

    plugin.reset();
    expect(plugin.getData()).toEqual([]);
  });

  test("getPlugin<T> typed access pattern", () => {
    interface CounterPlugin extends KataPlugin {
      getCount(): number;
    }

    function counterPlugin(): CounterPlugin {
      let count = 0;
      return {
        name: "counter",
        afterAction() { count++; },
        getCount() { return count; },
      };
    }

    const engine = new KataEngine();
    engine.use(counterPlugin());

    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    engine.registerScene(scene);
    engine.start("s1");

    const plugin = engine.getPlugin<CounterPlugin>("counter");
    expect(plugin).toBeDefined();
    expect(plugin!.getCount()).toBe(1);
  });
});
