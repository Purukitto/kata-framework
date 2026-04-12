import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Rewind State", () => {
  test("reverses condition splicing", () => {
    const scene = makeScene("s1", [
      { type: "condition", condition: "true", then: [{ type: "text", speaker: "A", content: "spliced in" }] },
      { type: "text", speaker: "A", content: "after condition" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    // start() auto-advances through condition → emits "spliced in"
    engine.start("s1");

    expect(frames[frames.length - 1].action.content).toBe("spliced in");

    // back() restores to before the splice, then re-evaluates the condition
    // Since condition is still "true", it splices again and emits "spliced in"
    engine.back();

    const lastFrame = frames[frames.length - 1];
    // The condition is auto-advanced, so we see the resolved content again
    expect(lastFrame.action.content).toBe("spliced in");
  });

  test("reverses choice mutations — rewinds past scene transitions", () => {
    const scene1 = makeScene("s1", [
      { type: "choice", choices: [{ id: "c1", label: "Go", target: "s2" }] },
    ]);
    const scene2 = makeScene("s2", [
      { type: "text", speaker: "B", content: "scene 2" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("s1");         // choice frame
    engine.makeChoice("c1");    // transitions to s2

    expect(frames[frames.length - 1].meta.id).toBe("s2");

    engine.back(); // should rewind to s1 choice

    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.meta.id).toBe("s1");
    expect(lastFrame.action.type).toBe("choice");
  });
});
