import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { KataEngine } from "../src/runtime/index";

describe("KataEngine", () => {
  test("Engine Flow", () => {
    const raw = `---
id: intro
---

:: Narrator ::
This is the first line.

:: Narrator ::
This is the second line.
`;

    // Parse and register
    const scene = parseKata(raw);
    const engine = new KataEngine();
    engine.registerScene(scene);

    // Collect emitted frames
    const frames: any[] = [];
    engine.on("update", (frame) => {
      frames.push(frame);
    });

    // Start the engine
    engine.start("intro");

    // Verify first frame contains Line 1
    expect(frames).toHaveLength(1);
    expect(frames[0].action.type).toBe("text");
    expect(frames[0].action.content).toBe("This is the first line.");
    expect(frames[0].meta.id).toBe("intro");
    expect(frames[0].state.currentActionIndex).toBe(0);

    // Move to next action
    engine.next();

    // Verify second frame contains Line 2
    expect(frames).toHaveLength(2);
    expect(frames[1].action.type).toBe("text");
    expect(frames[1].action.content).toBe("This is the second line.");
    expect(frames[1].meta.id).toBe("intro");
    expect(frames[1].state.currentActionIndex).toBe(1);
  });
});
