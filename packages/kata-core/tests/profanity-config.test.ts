import { expect, test, describe } from "bun:test";
import { profanityPlugin } from "../src/plugins/profanity";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction, KSONFrame } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

function getTextContent(engine: KataEngine, scene: KSONScene): string {
  engine.registerScene(scene);
  const frames: KSONFrame[] = [];
  engine.on("update", (f) => frames.push(f));
  engine.start(scene.meta.id);
  const action = frames[0]?.action;
  return action?.type === "text" ? action.content : "";
}

describe("profanity filter — config", () => {
  test("custom replacement string", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Say badword now" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"], replacement: "[CENSORED]" }));
    expect(getTextContent(engine, scene)).toBe("Say [CENSORED] now");
  });

  test("per-character mask replacement", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Say damn now" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["damn"], replacement: "mask" }));
    expect(getTextContent(engine, scene)).toBe("Say **** now");
  });

  test("per-character mask respects matched word length", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello and hi" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["hello", "hi"], replacement: "mask" }));
    expect(getTextContent(engine, scene)).toBe("***** and **");
  });

  test("custom replacement function receives matched word", () => {
    const matched: string[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Say BadWord now" },
    ]);
    const engine = new KataEngine();
    engine.use(
      profanityPlugin({
        words: ["badword"],
        replacement: (word) => {
          matched.push(word);
          return `[${word.length}]`;
        },
      })
    );
    expect(getTextContent(engine, scene)).toBe("Say [7] now");
    expect(matched).toEqual(["BadWord"]);
  });

  test("addWords adds words at runtime", () => {
    const plugin = profanityPlugin({ words: ["bad"] });
    const engine = new KataEngine();
    engine.use(plugin);

    plugin.addWords(["ugly"]);

    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "bad and ugly" },
    ]);
    expect(getTextContent(engine, scene)).toBe("*** and ***");
  });

  test("removeWords removes words at runtime", () => {
    const plugin = profanityPlugin({ words: ["bad", "ugly"] });
    const engine = new KataEngine();
    engine.use(plugin);

    plugin.removeWords(["bad"]);

    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "bad and ugly" },
    ]);
    expect(getTextContent(engine, scene)).toBe("bad and ***");
  });

  test("getWords returns current word list", () => {
    const plugin = profanityPlugin({ words: ["bad", "ugly"] });
    const words = plugin.getWords();
    expect(words.sort()).toEqual(["bad", "ugly"]);
  });

  test("getWords reflects runtime changes", () => {
    const plugin = profanityPlugin({ words: ["bad"] });
    plugin.addWords(["ugly"]);
    plugin.removeWords(["bad"]);
    expect(plugin.getWords()).toEqual(["ugly"]);
  });

  test("does not affect non-text/non-choice actions", () => {
    const scene = makeScene("s1", [
      { type: "visual", layer: "bg", src: "badword.png" } as KSONAction,
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "visual") {
      expect((frames[0].action as any).src).toBe("badword.png");
    }
  });
});
