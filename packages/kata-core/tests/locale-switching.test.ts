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

    engine.setLocale("ja"); // Re-emits current frame (index 0) in Japanese — frame 1
    expect(frames).toHaveLength(2);
    if (frames[1]!.action.type === "text") {
      expect(frames[1]!.action.content).toBe("一行目。");
    }

    engine.next(); // Frame 2: Second line in Japanese

    if (frames[2]!.action.type === "text") {
      expect(frames[2]!.action.content).toBe("二行目。");
    }
  });

  test("setLocale() re-emits current frame but does not re-emit already-passed frames", () => {
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

    engine.setLocale("ja"); // Re-emits the current frame (frame at index 0)
    expect(frames).toHaveLength(2);
    // Only the current frame is re-emitted, not any past frames
    expect(frames[1]!.state.currentActionIndex).toBe(0);
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
    engine.start("s1"); // Frame 0: Japanese "こんにちは。"
    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("こんにちは。");
    }

    engine.setLocale(""); // Back to base — re-emits current frame (index 0) in English
    // Frame 1: re-emitted "Hello." at index 0
    expect(frames).toHaveLength(2);
    if (frames[1]!.action.type === "text") {
      expect(frames[1]!.action.content).toBe("Hello.");
    }

    engine.next(); // Frame 2: "World." in English
    if (frames[2]!.action.type === "text") {
      expect(frames[2]!.action.content).toBe("World.");
    }
  });
});
