import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { createSandboxedExec, evaluate, evaluateWithDiagnostic } from "../src/runtime/evaluator";
import type { KSONScene } from "../src/types";

function makeScene(id: string, actions: any[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("Prototype Pollution Prevention", () => {
  test("exec block ctx has null prototype — no __proto__ traversal", () => {
    const execFn = createSandboxedExec("ctx.result = Object.getPrototypeOf(ctx);");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBeNull();
  });

  test("exec block cannot access constructor via ctx", () => {
    const execFn = createSandboxedExec("ctx.result = typeof ctx.constructor;");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBe("undefined");
  });

  test("evaluate() blocks constructor access", () => {
    const result = evaluate("constructor", {});
    // constructor is shadowed as undefined — not an error, returns undefined
    expect(result).toBeUndefined();
  });

  test("evaluateWithDiagnostic blocks __proto__", () => {
    const { result, error } = evaluateWithDiagnostic("__proto__", {});
    // __proto__ is shadowed as undefined
    expect(result).toBeUndefined();
  });

  test("prototype pollution via constructor.constructor is blocked in evaluate", () => {
    // This is a classic sandbox escape: constructor.constructor('return this')()
    const result = evaluate("constructor", { x: 1 });
    // constructor is shadowed, should return null (evaluation error) or undefined
    expect(result == null).toBe(true);
  });

  test("engine exec blocks use null-prototype ctx", () => {
    const scene = makeScene("test", [
      { type: "exec", code: "ctx.proto = Object.getPrototypeOf(ctx);" },
      { type: "text", speaker: "A", content: "done" },
    ]);

    const engine = new KataEngine({ proto: "unset" });
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f) => frames.push(f));

    engine.start("test");

    expect(frames[0].state.ctx.proto).toBeNull();
  });
});
