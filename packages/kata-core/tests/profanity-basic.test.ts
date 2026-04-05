import { expect, test, describe } from "bun:test";
import { profanityPlugin } from "../src/plugins/profanity";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction, KSONFrame } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("profanity filter — basic", () => {
  test("censors matching words in text actions", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "This is a badword here" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    expect(frames[0].action.type).toBe("text");
    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("This is a *** here");
      expect(frames[0].action.content).not.toContain("badword");
    }
  });

  test("censors matching words in choice labels when scope is 'all'", () => {
    const scene = makeScene("s1", [
      {
        type: "choice",
        choices: [
          { id: "c1", label: "Say badword", target: null },
          { id: "c2", label: "Stay silent", target: null },
        ],
      },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"], scope: "all" }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "choice") {
      expect(frames[0].action.choices[0].label).toBe("Say ***");
      expect(frames[0].action.choices[1].label).toBe("Stay silent");
    }
  });

  test("censors choice labels when scope is 'choice'", () => {
    const scene = makeScene("s1", [
      {
        type: "choice",
        choices: [
          { id: "c1", label: "Say badword", target: null },
        ],
      },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"], scope: "choice" }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "choice") {
      expect(frames[0].action.choices[0].label).toBe("Say ***");
    }
  });

  test("does NOT censor text when scope is 'choice'", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "This has badword in it" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"], scope: "choice" }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toContain("badword");
    }
  });

  test("does NOT censor choice labels when scope is 'text'", () => {
    const scene = makeScene("s1", [
      {
        type: "choice",
        choices: [
          { id: "c1", label: "Say badword", target: null },
        ],
      },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"], scope: "text" }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "choice") {
      expect(frames[0].action.choices[0].label).toContain("badword");
    }
  });

  test("case-insensitive matching", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "BADWORD and BadWord and badword" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["badword"] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("*** and *** and ***");
    }
  });

  test("does not censor partial words by default (word boundary)", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "The assassin attacked" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["ass"] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("The assassin attacked");
    }
  });

  test("censors partial words when partialMatch is true", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "The assassin attacked" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["ass"], partialMatch: true }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toContain("***");
    }
  });

  test("empty word list is a no-op", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello world" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: [] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("Hello world");
    }
  });

  test("multiple bad words are all censored", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "word1 and word2 are bad" },
    ]);
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["word1", "word2"] }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("*** and *** are bad");
    }
  });
});
