import { expect, test, describe } from "bun:test";
import { contentWarningsPlugin } from "../src/plugins/content-warnings";
import { loggerPlugin } from "../src/plugins/logger";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("content warnings — integration", () => {
  test("warning fires on makeChoice that transitions to a tagged scene", () => {
    const warned: string[] = [];
    const s1 = makeScene("s1", [
      {
        type: "choice",
        choices: [{ id: "c1", label: "Enter forest", target: "dark-forest" }],
      },
    ]);
    const s2 = makeScene("dark-forest", [
      { type: "text", speaker: "A", content: "Scary" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { "dark-forest": ["horror"] },
        onWarn: (id) => warned.push(id),
      })
    );
    engine.registerScene(s1);
    engine.registerScene(s2);
    engine.start("s1");

    expect(warned).toHaveLength(0); // s1 is not tagged

    engine.makeChoice("c1"); // transitions to dark-forest
    expect(warned).toHaveLength(1);
    expect(warned[0]).toBe("dark-forest");
  });

  test("warning fires on start for a tagged scene", () => {
    const warned: string[] = [];
    const scene = makeScene("tagged-scene", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { "tagged-scene": ["violence"] },
        onWarn: (id) => warned.push(id),
      })
    );
    engine.registerScene(scene);
    engine.start("tagged-scene");

    expect(warned).toHaveLength(1);
    expect(warned[0]).toBe("tagged-scene");
  });

  test("works alongside other plugins (ordering respected)", () => {
    const order: string[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { s1: ["test"] },
        onWarn: () => order.push("content-warning"),
      })
    );
    engine.use(
      loggerPlugin({
        level: "verbose",
        output: (entry) => {
          if (entry.hook === "beforeSceneChange") {
            order.push("logger");
          }
        },
      })
    );
    engine.registerScene(scene);
    engine.start("s1");

    // content-warnings was registered first, should fire first
    expect(order[0]).toBe("content-warning");
    expect(order[1]).toBe("logger");
  });

  test("runtime-added warning fires on subsequent transition", () => {
    const warned: string[] = [];
    const s1 = makeScene("s1", [
      {
        type: "choice",
        choices: [{ id: "c1", label: "Go", target: "s2" }],
      },
    ]);
    const s2 = makeScene("s2", [
      { type: "text", speaker: "A", content: "Scene 2" },
    ]);

    const engine = new KataEngine();
    const cw = contentWarningsPlugin({
      warnings: {},
      onWarn: (id) => warned.push(id),
    });
    engine.use(cw);
    engine.registerScene(s1);
    engine.registerScene(s2);
    engine.start("s1");

    // Add warning after engine started
    cw.addWarning("s2", ["spoilers"]);

    engine.makeChoice("c1");
    expect(warned).toHaveLength(1);
    expect(warned[0]).toBe("s2");
  });
});
