import { expect, test, describe } from "bun:test";
import { validatePlugin } from "../src/plugins/validate";
import { KataEngine, parseKata } from "../index";
import type { KataPlugin } from "../index";

describe("validatePlugin", () => {
  test("valid plugin with all hooks passes", () => {
    const plugin: KataPlugin = {
      name: "test",
      beforeAction: (a) => a,
      afterAction: () => {},
      onChoice: () => {},
      beforeSceneChange: () => {},
      onEnd: () => {},
    };
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("valid plugin with only name passes", () => {
    const result = validatePlugin({ name: "minimal" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("null produces error", () => {
    const result = validatePlugin(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("undefined produces error", () => {
    const result = validatePlugin(undefined);
    expect(result.valid).toBe(false);
  });

  test("non-object produces error", () => {
    const result = validatePlugin("not-a-plugin");
    expect(result.valid).toBe(false);
  });

  test("missing name produces error", () => {
    const result = validatePlugin({ beforeAction: () => null });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  test("empty string name produces error", () => {
    const result = validatePlugin({ name: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  test("non-string name produces error", () => {
    const result = validatePlugin({ name: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  test("non-function hook values produce errors", () => {
    const result = validatePlugin({
      name: "bad-hooks",
      beforeAction: "not-a-function",
      afterAction: 42,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("beforeAction"))).toBe(true);
    expect(result.errors.some((e) => e.includes("afterAction"))).toBe(true);
  });

  test("extra properties produce warnings", () => {
    const result = validatePlugin({
      name: "extra",
      unknownProp: true,
      anotherOne: "hello",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("unknownProp"))).toBe(true);
  });

  test("init hook is recognized as valid", () => {
    const result = validatePlugin({
      name: "with-init",
      init: () => {},
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("engine.use() validation", () => {
  test("throws on invalid plugin", () => {
    const engine = new KataEngine();
    expect(() => engine.use({} as any)).toThrow();
  });

  test("throws with descriptive message for missing name", () => {
    const engine = new KataEngine();
    expect(() => engine.use({ beforeAction: () => null } as any)).toThrow(
      /name/
    );
  });

  test("throws with descriptive message for bad hook type", () => {
    const engine = new KataEngine();
    expect(() =>
      engine.use({ name: "bad", beforeAction: "nope" } as any)
    ).toThrow(/beforeAction/);
  });

  test("accepts valid plugin", () => {
    const engine = new KataEngine();
    expect(() =>
      engine.use({ name: "valid", beforeAction: (a: any) => a })
    ).not.toThrow();
  });

  test("calls init hook after registration", () => {
    const engine = new KataEngine();
    let initCalled = false;
    let receivedEngine: any = null;
    engine.use({
      name: "init-test",
      init(eng: any) {
        initCalled = true;
        receivedEngine = eng;
      },
    });
    expect(initCalled).toBe(true);
    expect(receivedEngine).toBe(engine);
  });

  test("init hook can access getSnapshot", () => {
    const scene = parseKata("---\nid: s1\n---\n:: A :: Hello\n");
    const engine = new KataEngine({ x: 1 });
    engine.registerScene(scene);

    let snapshotWorks = false;
    engine.use({
      name: "snapshot-init",
      init(eng: any) {
        // Engine hasn't started so snapshot should still work
        const snap = eng.getSnapshot();
        snapshotWorks = snap && typeof snap.ctx === "object";
      },
    });
    expect(snapshotWorks).toBe(true);
  });
});
