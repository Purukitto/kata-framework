import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Missing Scene — throw strategy (default)", () => {
  test("start() throws when scene is not registered (default behavior)", () => {
    const engine = new KataEngine();
    expect(() => engine.start("nonexistent")).toThrow('Scene "nonexistent" not found');
  });

  test("start() throws with explicit onMissingScene: throw", () => {
    const engine = new KataEngine({}, { onMissingScene: "throw" });
    expect(() => engine.start("nonexistent")).toThrow('Scene "nonexistent" not found');
  });

  test("makeChoice() with invalid target throws by default", () => {
    const scene = makeScene("intro", [
      {
        type: "choice",
        choices: [
          { id: "go", label: "Go", target: "nonexistent" },
        ],
      },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("intro");

    expect(() => engine.makeChoice("go")).toThrow('Scene "nonexistent" not found');
  });
});
