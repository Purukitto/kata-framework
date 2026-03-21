import { expect, test, describe } from "bun:test";
import { assertFrame } from "../src/assertFrame";
import type { KSONFrame } from "@kata-framework/core";

const makeFrame = (overrides: Partial<KSONFrame> = {}): KSONFrame => ({
  meta: { id: "test" },
  action: { type: "text", speaker: "Narrator", content: "Hello" },
  state: { ctx: {}, currentSceneId: "test", currentActionIndex: 0, history: ["test"] },
  ...overrides,
});

describe("assertFrame", () => {
  test("passes on matching partial expectations", () => {
    const frame = makeFrame();
    expect(() => assertFrame(frame, { type: "text" })).not.toThrow();
    expect(() => assertFrame(frame, { speaker: "Narrator" })).not.toThrow();
    expect(() => assertFrame(frame, { content: "Hello" })).not.toThrow();
    expect(() => assertFrame(frame, { sceneId: "test" })).not.toThrow();
    expect(() => assertFrame(frame, { actionIndex: 0 })).not.toThrow();
  });

  test("passes with multiple matching fields", () => {
    const frame = makeFrame();
    expect(() =>
      assertFrame(frame, { type: "text", speaker: "Narrator", content: "Hello" })
    ).not.toThrow();
  });

  test("throws readable error on type mismatch", () => {
    const frame = makeFrame();
    expect(() => assertFrame(frame, { type: "choice" })).toThrow(/type mismatch/i);
  });

  test("throws readable error on content mismatch", () => {
    const frame = makeFrame();
    expect(() => assertFrame(frame, { content: "Goodbye" })).toThrow(/content mismatch/i);
  });

  test("throws readable error on speaker mismatch", () => {
    const frame = makeFrame();
    expect(() => assertFrame(frame, { speaker: "Alice" })).toThrow(/speaker mismatch/i);
  });

  test("throws readable error on scene id mismatch", () => {
    const frame = makeFrame();
    expect(() => assertFrame(frame, { sceneId: "other" })).toThrow(/scene id mismatch/i);
  });
});
