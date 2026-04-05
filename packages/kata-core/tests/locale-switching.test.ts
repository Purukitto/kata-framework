import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONFrame } from "../src/types";

describe("Locale switching", () => {
  test("setLocale() mid-scene affects subsequent frames", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "First line." },
        { type: "text", speaker: "N", content: "Second line." },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("s1", "ja", [
      { index: 0, content: "一行目。" },
      { index: 1, content: "二行目。" },
    ]);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("s1"); // Frame 0: English (no locale set)
    expect(frames[0]!.action.type).toBe("text");
    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("First line.");
    }

    engine.setLocale("ja");
    engine.next(); // Frame 1: Japanese

    if (frames[1]!.action.type === "text") {
      expect(frames[1]!.action.content).toBe("二行目。");
    }
  });

  test("setLocale() does NOT re-emit already-passed frames", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "Line one." },
        { type: "text", speaker: "N", content: "Line two." },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("s1"); // Emit frame 0
    expect(frames).toHaveLength(1);

    engine.setLocale("ja"); // Should not cause a new frame to be emitted
    expect(frames).toHaveLength(1);
  });

  test("switching back to base locale restores original text", () => {
    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "Hello." },
        { type: "text", speaker: "N", content: "World." },
        { type: "text", speaker: "N", content: "Goodbye." },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("s1", "ja", [
      { index: 0, content: "こんにちは。" },
      { index: 1, content: "世界。" },
      { index: 2, content: "さようなら。" },
    ]);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.setLocale("ja");
    engine.start("s1");
    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("こんにちは。");
    }

    engine.setLocale(""); // Back to base
    engine.next();
    if (frames[1]!.action.type === "text") {
      expect(frames[1]!.action.content).toBe("World.");
    }
  });
});
