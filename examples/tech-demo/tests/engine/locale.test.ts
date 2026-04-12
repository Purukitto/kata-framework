import { describe, test, expect } from "bun:test";
import { KataEngine, parseKata, parseLocaleYaml } from "@kata-framework/core";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");
const localesDir = join(import.meta.dir, "..", "..", "locales");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

describe("locale switching", () => {
  test("parseLocaleYaml parses Spanish prologue locale", () => {
    const content = readFileSync(join(localesDir, "es", "prologue.yaml"), "utf-8");
    const data = parseLocaleYaml(content);

    expect(data.locale).toBe("es");
    expect(data.overrides.length).toBeGreaterThan(0);
    expect(data.overrides[0].index).toBe(2);
    expect(data.overrides[0].content).toContain("pantallas");
  });

  test("parseLocaleYaml parses Japanese prologue locale", () => {
    const content = readFileSync(join(localesDir, "ja", "prologue.yaml"), "utf-8");
    const data = parseLocaleYaml(content);

    expect(data.locale).toBe("ja");
    expect(data.overrides.length).toBeGreaterThan(0);
    expect(data.overrides[0].content).toContain("画面");
  });

  test("engine applies Spanish locale overrides to text", () => {
    const engine = new KataEngine();
    const scene = parseKata(readScene("prologue.kata"));
    engine.registerScene(scene);

    // Register Spanish locale
    const esContent = readFileSync(join(localesDir, "es", "prologue.yaml"), "utf-8");
    const esData = parseLocaleYaml(esContent);
    engine.registerLocale("prologue", esData.locale, esData.overrides);
    engine.setLocale("es");

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));
    engine.start("prologue");

    // Advance past auto-advancing actions (exec, visual) to reach text
    let safety = 0;
    while (frames.filter((f: any) => f.action.type === "text").length === 0 && safety < 10) {
      engine.next();
      safety++;
    }

    const textFrame = frames.find((f: any) => f.action.type === "text");
    expect(textFrame).toBeDefined();
    expect(textFrame.action.content).toContain("pantallas");
  });

  test("engine applies Japanese locale overrides", () => {
    const engine = new KataEngine();
    const scene = parseKata(readScene("prologue.kata"));
    engine.registerScene(scene);

    const jaContent = readFileSync(join(localesDir, "ja", "prologue.yaml"), "utf-8");
    const jaData = parseLocaleYaml(jaContent);
    engine.registerLocale("prologue", jaData.locale, jaData.overrides);
    engine.setLocale("ja");

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));
    engine.start("prologue");

    let safety = 0;
    while (frames.filter((f: any) => f.action.type === "text").length === 0 && safety < 10) {
      engine.next();
      safety++;
    }

    const textFrame = frames.find((f: any) => f.action.type === "text");
    expect(textFrame).toBeDefined();
    expect(textFrame.action.content).toContain("画面");
  });

  test("switching locale mid-session changes text output", () => {
    const engine = new KataEngine();
    const scene = parseKata(readScene("prologue.kata"));
    engine.registerScene(scene);

    // Register both locales
    const esContent = readFileSync(join(localesDir, "es", "prologue.yaml"), "utf-8");
    const esData = parseLocaleYaml(esContent);
    engine.registerLocale("prologue", esData.locale, esData.overrides);

    const jaContent = readFileSync(join(localesDir, "ja", "prologue.yaml"), "utf-8");
    const jaData = parseLocaleYaml(jaContent);
    engine.registerLocale("prologue", jaData.locale, jaData.overrides);

    // Start in English (no locale set)
    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));
    engine.start("prologue");

    // Advance to get text frames
    let safety = 0;
    while (frames.filter((f: any) => f.action.type === "text").length === 0 && safety < 10) {
      engine.next();
      safety++;
    }

    const firstText = frames.find((f: any) => f.action.type === "text");
    expect(firstText.action.content).toContain("screens went dark");

    // Switch to Spanish and advance
    engine.setLocale("es");
    engine.next();
    const textFrames = frames.filter((f: any) => f.action.type === "text");
    const lastTextFrame = textFrames[textFrames.length - 1];
    expect(lastTextFrame.action.content).toContain("seguridad temporal");
  });

  test("all locale files parse without error", () => {
    const languages = ["es", "ja"];
    const sceneNames = ["prologue", "booth", "shutdown", "liberation"];

    for (const lang of languages) {
      for (const scene of sceneNames) {
        const filePath = join(localesDir, lang, `${scene}.yaml`);
        const content = readFileSync(filePath, "utf-8");
        const data = parseLocaleYaml(content);
        expect(data.locale).toBe(lang);
        expect(data.overrides.length).toBeGreaterThan(0);
      }
    }
  });
});
