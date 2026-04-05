import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONFrame } from "../src/types";

function makeTextScene(id: string, actions: Array<{ speaker: string; content: string }>): KSONScene {
  return {
    meta: { id },
    script: "",
    actions: actions.map((a) => ({ type: "text" as const, ...a })),
  };
}

describe("Locale resolution", () => {
  test("setting locale replaces text content in emitted frames", () => {
    const scene = makeTextScene("intro", [
      { speaker: "Narrator", content: "Welcome to the forest." },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", "ja", [
      { index: 0, content: "森へようこそ。" },
    ]);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    expect(frames[0]!.action.type).toBe("text");
    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("森へようこそ。");
    }
  });

  test("missing locale key falls back to base language", () => {
    const scene = makeTextScene("intro", [
      { speaker: "Narrator", content: "Original text." },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    // No locale registered for "ja"
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("Original text.");
    }
  });

  test("missing locale file falls back to fallback locale", () => {
    const scene = makeTextScene("intro", [
      { speaker: "Narrator", content: "English text." },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", "en", [
      { index: 0, content: "English fallback." },
    ]);
    engine.setLocale("fr"); // No French registered
    engine.setLocaleFallback("en");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("English fallback.");
    }
  });

  test("speaker names can be overridden per locale", () => {
    const scene = makeTextScene("intro", [
      { speaker: "Merchant", content: "Buy something!" },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", "ja", [
      { index: 0, speaker: "商人", content: "何か買いませんか？" },
    ]);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.speaker).toBe("商人");
      expect(frames[0]!.action.content).toBe("何か買いませんか？");
    }
  });

  test("no locale set returns original text", () => {
    const scene = makeTextScene("intro", [
      { speaker: "N", content: "Base." },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", "ja", [{ index: 0, content: "日本語" }]);
    // No setLocale() call

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("Base.");
    }
  });

  test("only overridden action indices are affected", () => {
    const scene = makeTextScene("intro", [
      { speaker: "A", content: "Line one." },
      { speaker: "B", content: "Line two." },
    ]);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", "ja", [
      { index: 0, content: "一行目。" },
      // index 1 not overridden
    ]);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");
    engine.next();

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("一行目。");
    }
    if (frames[1]!.action.type === "text") {
      expect(frames[1]!.action.content).toBe("Line two.");
    }
  });
});
