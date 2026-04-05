import { expect, test, describe } from "bun:test";
import { KataEngine } from "../src/runtime/index";
import { LayeredVFS } from "../src/vfs/index";
import { parseLocaleYaml } from "../src/i18n/index";
import type { KSONScene, KSONFrame, VFSProvider } from "../src/types";

function createMemoryVFS(files: Record<string, string>): VFSProvider {
  return {
    async readFile(path: string) {
      return files[path] ?? null;
    },
    async listDir(path: string) {
      return Object.keys(files).filter((f) => f.startsWith(path));
    },
  };
}

describe("Locale VFS integration", () => {
  const scene: KSONScene = {
    meta: { id: "intro" },
    script: "",
    actions: [{ type: "text", speaker: "Narrator", content: "Welcome to the forest." }],
  };

  test("locale files can be loaded from VFS layers", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createMemoryVFS({
      "scenes/intro.kata.ja.yml": `locale: ja\noverrides:\n  - index: 0\n    content: "森へようこそ。"`,
    }));

    const content = await vfs.readFile("scenes/intro.kata.ja.yml");
    expect(content).not.toBeNull();

    const localeData = parseLocaleYaml(content!);
    expect(localeData.locale).toBe("ja");
    expect(localeData.overrides).toHaveLength(1);
    expect(localeData.overrides[0]!.index).toBe(0);
    expect(localeData.overrides[0]!.content).toBe("森へようこそ。");

    // Now register and use
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.registerLocale("intro", localeData.locale, localeData.overrides);
    engine.setLocale("ja");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("森へようこそ。");
    }
  });

  test("mod layer can override base locale", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createMemoryVFS({
      "scenes/intro.kata.ja.yml": `locale: ja\noverrides:\n  - index: 0\n    content: "森へようこそ。"`,
    }));
    vfs.addLayer("mod", createMemoryVFS({
      "scenes/intro.kata.ja.yml": `locale: ja\noverrides:\n  - index: 0\n    content: "モッドの森へようこそ。"`,
    }));

    // Mod layer takes priority (added later)
    const content = await vfs.readFile("scenes/intro.kata.ja.yml");
    const localeData = parseLocaleYaml(content!);

    expect(localeData.overrides[0]!.content).toBe("モッドの森へようこそ。");
  });

  test("missing VFS locale file gracefully falls back", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createMemoryVFS({}));

    const content = await vfs.readFile("scenes/intro.kata.fr.yml");
    expect(content).toBeNull();

    // Engine should work fine without locale file
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.setLocale("fr");

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));
    engine.start("intro");

    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("Welcome to the forest.");
    }
  });
});
