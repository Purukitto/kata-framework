import { expect, test, describe } from "bun:test";
import { evaluate, evaluateWithDiagnostic, createSandboxedExec } from "../src/runtime/evaluator";

describe("Blocked Globals in Evaluation", () => {
  test("process is undefined inside evaluate()", () => {
    const result = evaluate("typeof process", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("require is undefined inside evaluate()", () => {
    const result = evaluate("typeof require", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("fetch is undefined inside evaluate()", () => {
    const result = evaluate("typeof fetch", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("globalThis is undefined inside evaluate()", () => {
    const result = evaluate("typeof globalThis", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("window is undefined inside evaluate()", () => {
    const result = evaluate("typeof window", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("user context keys still accessible", () => {
    const result = evaluate("x + y", { x: 10, y: 20 });
    expect(result).toBe(30);
  });

  test("user context key named same as blocked global wins", () => {
    // If user has a variable called 'process', their value should be used
    const result = evaluate("process", { process: "running" });
    expect(result).toBe("running");
  });

  test("evaluateWithDiagnostic also blocks globals", () => {
    const { result } = evaluateWithDiagnostic("typeof process", { x: 1 });
    expect(result).toBe("undefined");
  });

  test("exec blocks also shadow dangerous globals", () => {
    const execFn = createSandboxedExec("ctx.result = typeof process;");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBe("undefined");
  });

  test("exec blocks shadow fetch", () => {
    const execFn = createSandboxedExec("ctx.result = typeof fetch;");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBe("undefined");
  });

  test("exec blocks shadow globalThis", () => {
    const execFn = createSandboxedExec("ctx.result = typeof globalThis;");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBe("undefined");
  });

  test("exec blocks shadow XMLHttpRequest", () => {
    const execFn = createSandboxedExec("ctx.result = typeof XMLHttpRequest;");
    const ctx = Object.assign(Object.create(null), { result: "unset" });
    execFn(ctx);
    expect(ctx.result).toBe("undefined");
  });
});
