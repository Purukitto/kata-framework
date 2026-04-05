import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONFrame } from "../src/types";

describe("Locale interpolation", () => {
  test("${player.name} still interpolates correctly in localized text", () => {
    const scene: KSONScene = {
      meta: { id: "intro" },
      script: "",
      actions: [
        { type: "text", speaker: "Narrator", content: "Welcome, ${player.name}." },
      ],
    };

    const engine = new KataEngine({ player: { name: "Aya" } });
    engine.registerScene(scene);
    engine.registerLocale("intro", "ja", [
      { index: 0, content: "ようこそ、${player.name}。" },
    ]);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("ようこそ、Aya。");
    }
  });

  test("conditions are NOT localized (logic is language-independent)", () => {
    const scene: KSONScene = {
      meta: { id: "cond" },
      script: "",
      actions: [
        {
          type: "condition",
          condition: "gold > 50",
          then: [{ type: "text", speaker: "N", content: "Rich!" }],
          else: [{ type: "text", speaker: "N", content: "Poor!" }],
        },
      ],
    };

    const engine = new KataEngine({ gold: 100 });
    engine.registerScene(scene);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("cond");
    engine.next(); // process condition

    // Condition still evaluates correctly regardless of locale
    const textFrame = frames.find((f) => f.action.type === "text");
    expect(textFrame).toBeDefined();
    if (textFrame && textFrame.action.type === "text") {
      expect(textFrame.action.content).toBe("Rich!");
    }
  });

  test("nested interpolation in localized text works", () => {
    const scene: KSONScene = {
      meta: { id: "nested" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "${greeting}, ${player.name}!" },
      ],
    };

    const engine = new KataEngine({ greeting: "Hello", player: { name: "Kai" } });
    engine.registerScene(scene);
    engine.registerLocale("nested", "es", [
      { index: 0, content: "${greeting}, ${player.name}!" },
    ]);
    engine.setLocale("es");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("nested");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("Hello, Kai!");
    }
  });
});
