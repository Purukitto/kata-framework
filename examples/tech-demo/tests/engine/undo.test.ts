import { describe, test, expect } from "bun:test";
import { createTestEngine } from "@kata-framework/test-utils";

describe("undo / rewind", () => {
  const simpleScene = `---
id: test
title: Test
---

:: Alice :: Line one.

:: Alice :: Line two.

:: Alice :: Line three.
`;

  test("back() restores previous frame", () => {
    const { engine, frames } = createTestEngine(simpleScene);

    engine.start("test");
    const frame0Action = { ...frames[frames.length - 1].action };

    engine.next();
    const frame1Action = { ...frames[frames.length - 1].action };
    expect(frame1Action).not.toEqual(frame0Action);

    engine.back();
    const restoredAction = frames[frames.length - 1].action;
    expect(restoredAction).toEqual(frame0Action);
  });

  test("back() at start is a no-op", () => {
    const { engine, frames } = createTestEngine(simpleScene);

    engine.start("test");
    const frame0 = { ...frames[frames.length - 1].action };

    engine.back();
    const afterBack = frames[frames.length - 1].action;
    expect(afterBack).toEqual(frame0);
  });

  test("back() restores ctx after exec mutation", () => {
    const sceneWithExec = `---
id: exec_test
title: Exec Test
---

:: Narrator :: Before exec.

[exec]
ctx.score = 42;
[/exec]

:: Narrator :: After exec. Score is set.
`;
    const { engine, frames } = createTestEngine(sceneWithExec);

    engine.start("exec_test");
    // Frame 0: "Before exec." — ctx.score is undefined
    expect(frames[frames.length - 1].state.ctx.score).toBeUndefined();

    engine.next();
    // Frame 1: exec block runs (auto-advances to next text)
    // Frame should now show "After exec" with ctx.score = 42
    expect(frames[frames.length - 1].state.ctx.score).toBe(42);

    engine.back();
    // Should restore to before exec — score should be undefined again
    expect(frames[frames.length - 1].state.ctx.score).toBeUndefined();
  });
});
