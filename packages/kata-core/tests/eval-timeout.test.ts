import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { createSandboxedExec } from "../src/runtime/evaluator";
import type { KSONScene, Diagnostic } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Evaluation Timeout (loop guard)", () => {
  test("while(true){} in exec block emits error, does not hang", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "while(true){ ctx.x = 1; }" },
      { type: "text", speaker: "A", content: "after" },
    ]);

    const engine = new KataEngine({}, { evalTimeout: 1000 });
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("loop iteration limit exceeded");
    // Engine should continue past the failed exec
    expect(frames.length).toBeGreaterThanOrEqual(1);
  });

  test("for(;;){} is caught by loop guard", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "for(;;){ ctx.x = 1; }" },
      { type: "text", speaker: "A", content: "after" },
    ]);

    const engine = new KataEngine({}, { evalTimeout: 500 });
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    engine.start("test");

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("loop iteration limit exceeded");
  });

  test("legitimate loops under the limit work fine", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "ctx.sum = 0; for(var i = 0; i < 100; i++){ ctx.sum += i; }" },
      { type: "text", speaker: "A", content: "result: ${sum}" },
    ]);

    const engine = new KataEngine({ sum: 0 });
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(errors).toHaveLength(0);
    expect(frames[0].action.content).toBe("result: 4950");
  });

  test("custom evalTimeout option controls the limit", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "var i = 0; while(i < 50){ i++; ctx.count = i; }" },
      { type: "text", speaker: "A", content: "done" },
    ]);

    // Set limit very low — 10 iterations
    const engine = new KataEngine({ count: 0 }, { evalTimeout: 10 });
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    engine.start("test");

    // The loop tries 50 iterations but limit is 10
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("loop iteration limit exceeded");
  });

  test("createSandboxedExec directly — loop guard throws on overflow", () => {
    const execFn = createSandboxedExec("while(true){ ctx.x = 1; }", 100);
    const ctx = Object.create(null);
    ctx.x = 0;
    expect(() => execFn(ctx)).toThrow("loop iteration limit exceeded");
  });

  test("createSandboxedExec directly — normal code works", () => {
    const execFn = createSandboxedExec("ctx.x = 42;");
    const ctx = Object.create(null);
    ctx.x = 0;
    execFn(ctx);
    expect(ctx.x).toBe(42);
  });
});
