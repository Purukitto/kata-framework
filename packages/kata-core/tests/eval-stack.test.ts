import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { evaluate, evaluateWithDiagnostic } from "../src/runtime/evaluator";
import type { KSONScene, Diagnostic } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Stack Overflow Protection", () => {
  test("evaluate() returns null on syntax error (does not crash)", () => {
    const result = evaluate("{{{{invalid", { x: 1 });
    expect(result).toBeNull();
  });

  test("evaluateWithDiagnostic returns error on syntax error", () => {
    const { result, error } = evaluateWithDiagnostic("{{{{invalid", { x: 1 });
    expect(result).toBeNull();
    expect(error).toBeDefined();
  });

  test("engine continues after evaluation error in condition", () => {
    const scene = makeScene("test", [
      { type: "condition", condition: "{{broken}}", then: [{ type: "text", speaker: "A", content: "hidden" }] },
      { type: "text", speaker: "B", content: "after" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Condition evaluation failed");

    // Engine should continue past the failed condition
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0].action.content).toBe("after");
  });

  test("engine continues after runtime error in exec block", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "ctx.x.y.z = 1;" },
      { type: "text", speaker: "A", content: "survived" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Exec evaluation failed");

    // Engine should continue
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0].action.content).toBe("survived");
  });

  test("engine continues after RangeError in exec block", () => {
    // Create a deeply nested property access that blows the stack via recursive toString
    const scene = makeScene("test", [
      { type: "exec", code: "function f(n) { if (n <= 0) return 1; return f(n-1); } f(100000);" },
      { type: "text", speaker: "A", content: "survived" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Exec evaluation failed");

    // Engine should continue
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0].action.content).toBe("survived");
  });
});
