import { expect, test, describe } from "bun:test";
import { parseKata, KataEngine } from "@kata-framework/core";
import { collectFrames } from "../src/collectFrames";

describe("collectFrames", () => {
  test("advances to end", () => {
    const engine = new KataEngine();
    engine.registerScene(
      parseKata(`---
id: s1
---

:: A :: line 1

:: A :: line 2

:: A :: line 3
`)
    );

    const frames = collectFrames(engine, "s1");
    expect(frames).toHaveLength(3);
  });

  test("stops at choice when no autoPick", () => {
    const engine = new KataEngine();
    engine.registerScene(
      parseKata(`---
id: s1
---

:: A :: before choice

* [Option A] -> @other
* [Option B] -> @other
`)
    );

    const frames = collectFrames(engine, "s1");
    // Should stop at the choice
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame!.action.type).toBe("choice");
  });

  test("autoPick string selects choice by id", () => {
    const scene1 = parseKata(`---
id: s1
---

:: A :: before

* [Go] -> @s2
`);
    const scene2 = parseKata(`---
id: s2
---

:: B :: arrived
`);

    const engine = new KataEngine();
    engine.registerScene(scene1);
    engine.registerScene(scene2);

    const frames = collectFrames(engine, "s1", { autoPick: "c_0" });
    // Should have advanced through the choice to s2
    expect(frames.some((f) => f.meta.id === "s2")).toBe(true);
  });
});
