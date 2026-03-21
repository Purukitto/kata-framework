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

    engine.start("s1");  // shows condition action
    engine.next();       // evaluates condition=true → splices, shows "spliced in"

    expect(frames[frames.length - 1].action.content).toBe("spliced in");

    // back() should restore to before the splice
    engine.back();

    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.action.type).toBe("condition");
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
