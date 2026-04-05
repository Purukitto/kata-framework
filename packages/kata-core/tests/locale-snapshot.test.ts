import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { CURRENT_SCHEMA_VERSION } from "../src/runtime/snapshot";
import type { KSONScene, KSONFrame } from "../src/types";

describe("Locale snapshot integration", () => {
  const scene: KSONScene = {
    meta: { id: "s1" },
    script: "",
    actions: [
      { type: "text", speaker: "N", content: "Hello." },
      { type: "text", speaker: "N", content: "World." },
    ],
  };

  test("current schema version is 3", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
  });

  test("locale is included in snapshot", () => {
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.setLocale("ja");
    engine.setLocaleFallback("en");
    engine.start("s1");

    const snapshot = engine.getSnapshot();
    expect(snapshot.locale).toBe("ja");
    expect(snapshot.localeFallback).toBe("en");
    expect(snapshot.schemaVersion).toBe(3);
  });

  test("loading a snapshot restores locale", () => {
    const engine1 = new KataEngine();
    engine1.registerScene(scene);
    engine1.registerLocale("s1", "ja", [
      { index: 0, content: "こんにちは。" },
      { index: 1, content: "世界。" },
    ]);
    engine1.setLocale("ja");
    engine1.start("s1");

    const snapshot = engine1.getSnapshot();

    const engine2 = new KataEngine();
    engine2.registerScene(scene);
    engine2.registerLocale("s1", "ja", [
      { index: 0, content: "こんにちは。" },
      { index: 1, content: "世界。" },
    ]);

    const frames: KSONFrame[] = [];
    engine2.on("update", (f: KSONFrame) => frames.push(f));
    engine2.loadSnapshot(snapshot);

    // Snapshot restored locale, so next frame should be localized
    engine2.next();
    if (frames[frames.length - 1]!.action.type === "text") {
      expect(frames[frames.length - 1]!.action.content).toBe("世界。");
    }
  });

  test("v2 snapshots load correctly (no locale)", () => {
    const v2Snapshot = {
      schemaVersion: 2,
      ctx: {},
      currentSceneId: "s1",
      currentActionIndex: 0,
      history: ["s1"],
      undoStack: [],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    // Should not throw — v2→v3 migration handles missing locale fields
    expect(() => engine.loadSnapshot(v2Snapshot)).not.toThrow();
    expect(frames).toHaveLength(1);
  });

  test("snapshot without locale omits locale fields", () => {
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("s1");

    const snapshot = engine.getSnapshot();
    expect(snapshot.locale).toBeUndefined();
    expect(snapshot.localeFallback).toBeUndefined();
  });
});
