import { expect, test, describe } from "bun:test";
import { mergeScene, type ScenePatch } from "../src/modding/mergeScene";
import type { KSONScene } from "../src/types";

const baseScene: KSONScene = {
  meta: { id: "test-scene", title: "Original", assets: { bg: "bg.png" } },
  script: "const x = 1;",
  actions: [
    { type: "text", speaker: "A", content: "Hello" },
    { type: "text", speaker: "B", content: "World" },
    { type: "visual", layer: "bg", src: "bg.png" },
  ],
};

describe("mergeScene", () => {
  test("meta: shallow merge adds/overwrites keys", () => {
    const result = mergeScene(baseScene, { meta: { title: "Modded", newKey: 42 } });
    expect(result.meta.title).toBe("Modded");
    expect((result.meta as any).newKey).toBe(42);
    expect(result.meta.id).toBe("test-scene");
  });

  test("meta: null removes a key", () => {
    const result = mergeScene(baseScene, { meta: { title: null } });
    expect(result.meta.title).toBeUndefined();
    expect(result.meta.id).toBe("test-scene");
  });

  test("meta: null on 'id' throws", () => {
    expect(() => mergeScene(baseScene, { meta: { id: null } })).toThrow("Cannot remove 'id'");
  });

  test("actions: append", () => {
    const patch: ScenePatch = {
      actions: [{ op: "append", actions: [{ type: "text", speaker: "C", content: "Appended" }] }],
    };
    const result = mergeScene(baseScene, patch);
    expect(result.actions).toHaveLength(4);
    expect(result.actions[3]).toEqual({ type: "text", speaker: "C", content: "Appended" });
  });

  test("actions: replace", () => {
    const patch: ScenePatch = {
      actions: [{ op: "replace", index: 0, action: { type: "text", speaker: "X", content: "Replaced" } }],
    };
    const result = mergeScene(baseScene, patch);
    expect(result.actions[0]).toEqual({ type: "text", speaker: "X", content: "Replaced" });
    expect(result.actions).toHaveLength(3);
  });

  test("actions: insertBefore", () => {
    const patch: ScenePatch = {
      actions: [{ op: "insertBefore", index: 1, actions: [{ type: "text", speaker: "I", content: "Inserted" }] }],
    };
    const result = mergeScene(baseScene, patch);
    expect(result.actions).toHaveLength(4);
    expect(result.actions[1]).toEqual({ type: "text", speaker: "I", content: "Inserted" });
    expect(result.actions[2]).toEqual({ type: "text", speaker: "B", content: "World" });
  });

  test("actions: insertAfter", () => {
    const patch: ScenePatch = {
      actions: [{ op: "insertAfter", index: 0, actions: [{ type: "text", speaker: "I", content: "After" }] }],
    };
    const result = mergeScene(baseScene, patch);
    expect(result.actions).toHaveLength(4);
    expect(result.actions[1]).toEqual({ type: "text", speaker: "I", content: "After" });
  });

  test("actions: remove", () => {
    const patch: ScenePatch = { actions: [{ op: "remove", index: 1 }] };
    const result = mergeScene(baseScene, patch);
    expect(result.actions).toHaveLength(2);
    expect(result.actions[1]).toEqual({ type: "visual", layer: "bg", src: "bg.png" });
  });

  test("combined: multiple patches applied sequentially", () => {
    const patch: ScenePatch = {
      actions: [
        { op: "remove", index: 0 },          // removes "Hello", now ["World", "bg.png"]
        { op: "append", actions: [{ type: "text", speaker: "Z", content: "End" }] },
      ],
    };
    const result = mergeScene(baseScene, patch);
    expect(result.actions).toHaveLength(3);
    expect(result.actions[0]).toEqual({ type: "text", speaker: "B", content: "World" });
    expect(result.actions[2]).toEqual({ type: "text", speaker: "Z", content: "End" });
  });

  test("does not mutate the base scene", () => {
    const original = structuredClone(baseScene);
    mergeScene(baseScene, { meta: { title: "Changed" }, actions: [{ op: "remove", index: 0 }] });
    expect(baseScene).toEqual(original);
  });

  test("script replacement works", () => {
    const result = mergeScene(baseScene, { script: "const y = 2;" });
    expect(result.script).toBe("const y = 2;");
    expect(baseScene.script).toBe("const x = 1;");
  });
});
