import { describe, test, expect } from "bun:test";
import { createTestEngine, collectFrames, assertFrame } from "@kata-framework/test-utils";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

describe("prologue scene", () => {
  test("parses and produces text frames", () => {
    const { engine } = createTestEngine(readScene("prologue.kata"));
    const frames = collectFrames(engine, "prologue");

    const textFrames = frames.filter((f) => f.action.type === "text");
    expect(textFrames.length).toBeGreaterThan(0);
    assertFrame(textFrames[0], {
      type: "text",
      speaker: "Narrator",
    });
  });

  test("initializes ctx via exec block", () => {
    const { engine } = createTestEngine(readScene("prologue.kata"));
    const frames = collectFrames(engine, "prologue");

    // After the exec block runs, ctx should have initial values
    const textFrames = frames.filter((f) => f.action.type === "text");
    const firstText = textFrames[0];
    expect(firstText.state.ctx.intel).toBe(0);
    expect(firstText.state.ctx.suspicion).toBe(0);
    expect(firstText.state.ctx.listeners).toBe(0);
  });

  test("opening line sets the tone", () => {
    const { engine } = createTestEngine(readScene("prologue.kata"));
    const frames = collectFrames(engine, "prologue");

    const textFrames = frames.filter((f) => f.action.type === "text");
    assertFrame(textFrames[0], {
      type: "text",
      speaker: "Narrator",
      content: "The screens went dark three weeks ago. Every channel — dead. Every feed — silenced.",
    });
  });

  test("contains visual and wait actions", () => {
    const { engine } = createTestEngine(readScene("prologue.kata"));
    const frames = collectFrames(engine, "prologue");

    const visualFrames = frames.filter((f) => f.action.type === "visual");
    const waitFrames = frames.filter((f) => f.action.type === "wait");

    expect(visualFrames.length).toBeGreaterThan(0);
    expect(waitFrames.length).toBeGreaterThan(0);
  });

  test("ends with a choice to enter the studio", () => {
    const { engine } = createTestEngine(readScene("prologue.kata"));
    const frames = collectFrames(engine, "prologue");

    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.action.type).toBe("choice");

    if (lastFrame.action.type === "choice") {
      expect(lastFrame.action.choices.length).toBe(1);
      expect(lastFrame.action.choices[0].label).toBe("Enter the studio");
      expect(lastFrame.action.choices[0].target).toBe("booth");
    }
  });
});
