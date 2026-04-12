import { describe, test, expect } from "bun:test";
import { createTestEngine, collectFrames } from "@kata-framework/test-utils";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

function loadAllScenes(): string[] {
  return [
    readScene("prologue.kata"),
    readScene("studio/booth.kata"),
    readScene("studio/first-broadcast.kata"),
    readScene("studio/caller-maria.kata"),
    readScene("studio/caller-vex.kata"),
    readScene("studio/editorial-choice.kata"),
    readScene("rooftop/signal-tower.kata"),
    readScene("endings/shutdown.kata"),
    readScene("endings/liberation.kata"),
    readScene("endings/underground.kata"),
  ];
}

describe("story branching", () => {
  test("prologue initializes context variables via exec block", () => {
    const { engine } = createTestEngine(loadAllScenes());
    const frames = collectFrames(engine, "prologue");

    // After exec block runs, text frames should have ctx initialized
    const textFrames = frames.filter((f) => f.action.type === "text");
    expect(textFrames.length).toBeGreaterThan(0);
    const ctx = textFrames[0].state.ctx;
    expect(ctx.intel).toBe(0);
    expect(ctx.suspicion).toBe(0);
    expect(ctx.listeners).toBe(0);
    expect(ctx.revaTrust).toBe(0);
    expect(ctx.broadcastsAired).toBe(0);
  });

  test("prologue leads to booth", () => {
    const { engine } = createTestEngine(loadAllScenes());
    const frames = collectFrames(engine, "prologue");

    const choiceFrame = frames.find((f) => f.action.type === "choice");
    expect(choiceFrame).toBeDefined();

    if (choiceFrame && choiceFrame.action.type === "choice") {
      expect(choiceFrame.action.choices[0].target).toBe("booth");
    }
  });

  test("first_broadcast increments listeners and broadcastsAired", () => {
    const { engine } = createTestEngine(loadAllScenes(), {
      intel: 0, suspicion: 0, listeners: 0, revaTrust: 0, broadcastsAired: 0,
    });
    const frames = collectFrames(engine, "first_broadcast");

    // Find a text frame after exec blocks have run
    const textFrames = frames.filter((f) => f.action.type === "text");
    const lastText = textFrames[textFrames.length - 1];
    if (lastText) {
      expect(lastText.state.ctx.broadcastsAired).toBe(1);
      expect(lastText.state.ctx.listeners).toBe(150);
    }
  });

  test("caller_maria increases intel and revaTrust", () => {
    const { engine } = createTestEngine(loadAllScenes(), {
      intel: 0, suspicion: 0, listeners: 0, revaTrust: 0, broadcastsAired: 0,
    });
    const frames = collectFrames(engine, "caller_maria");

    const choiceFrame = frames.find((f) => f.action.type === "choice");
    if (choiceFrame) {
      expect(choiceFrame.state.ctx.intel).toBe(1);
      expect(choiceFrame.state.ctx.revaTrust).toBe(2);
    }
  });

  test("caller_vex increases intel by 2 and raises suspicion", () => {
    const { engine } = createTestEngine(loadAllScenes(), {
      intel: 0, suspicion: 0, listeners: 0, revaTrust: 0, broadcastsAired: 0,
    });
    const frames = collectFrames(engine, "caller_vex");

    const choiceFrame = frames.find((f) => f.action.type === "choice");
    if (choiceFrame) {
      expect(choiceFrame.state.ctx.intel).toBe(2);
      expect(choiceFrame.state.ctx.suspicion).toBeGreaterThanOrEqual(2);
    }
  });

  test("shutdown ending plays to completion", () => {
    const { engine } = createTestEngine(loadAllScenes());
    let ended = false;
    engine.on("end", () => { ended = true; });

    collectFrames(engine, "shutdown");
    expect(ended).toBe(true);
  });

  test("liberation ending plays to completion", () => {
    const { engine } = createTestEngine(loadAllScenes());
    let ended = false;
    engine.on("end", () => { ended = true; });

    collectFrames(engine, "liberation");
    expect(ended).toBe(true);
  });

  test("underground ending plays to completion", () => {
    const { engine } = createTestEngine(loadAllScenes());
    let ended = false;
    engine.on("end", () => { ended = true; });

    collectFrames(engine, "underground");
    expect(ended).toBe(true);
  });

  test("full playthrough auto-picks first choice to an ending", () => {
    const { engine } = createTestEngine(loadAllScenes());
    let ended = false;
    engine.on("end", () => { ended = true; });

    const allFrames = collectFrames(engine, "prologue", {
      autoPick: (choices) => choices[0].id,
    });

    expect(ended).toBe(true);
    expect(allFrames.length).toBeGreaterThan(10);
  });
});
