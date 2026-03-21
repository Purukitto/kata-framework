import { expect, test, describe } from "bun:test";
import { AssetRegistry } from "../src/assets/index";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../src/types";

describe("AssetRegistry", () => {
  test("register stores and retrieves URL", () => {
    const reg = new AssetRegistry();
    reg.register("bg", "/assets/bg.png");
    expect(reg.getUrl("bg")).toBe("/assets/bg.png");
    expect(reg.getUrl("missing")).toBeUndefined();
  });

  test("registerFromScene extracts from meta.assets", () => {
    const reg = new AssetRegistry();
    const scene: KSONScene = {
      meta: { id: "s1", assets: { bgm: "/audio/bgm.mp3", bg: "/img/bg.jpg" } },
      script: "",
      actions: [],
    };
    reg.registerFromScene(scene);
    expect(reg.getUrl("bgm")).toBe("/audio/bgm.mp3");
    expect(reg.getUrl("bg")).toBe("/img/bg.jpg");
  });

  test("registerFromScene extracts src from visual actions", () => {
    const reg = new AssetRegistry();
    const scene: KSONScene = {
      meta: { id: "s2" },
      script: "",
      actions: [
        { type: "visual", layer: "bg", src: "/img/forest.png" },
        { type: "text", speaker: "N", content: "Hello" },
        { type: "visual", layer: "fg", src: "/img/char.png" },
      ],
    };
    reg.registerFromScene(scene);
    expect(reg.getUrl("/img/forest.png")).toBe("/img/forest.png");
    expect(reg.getUrl("/img/char.png")).toBe("/img/char.png");
  });

  test("getAssetsForScene returns correct IDs", () => {
    const reg = new AssetRegistry();
    const scene: KSONScene = {
      meta: { id: "s3", assets: { a: "a.png" } },
      script: "",
      actions: [{ type: "visual", layer: "bg", src: "b.png" }],
    };
    reg.registerFromScene(scene);
    expect(reg.getAssetsForScene("s3")).toEqual(["a", "b.png"]);
  });

  test("getAssetsForScene returns empty array for unknown scene", () => {
    const reg = new AssetRegistry();
    expect(reg.getAssetsForScene("unknown")).toEqual([]);
  });

  test("getAssetsForScenes merges and deduplicates", () => {
    const reg = new AssetRegistry();
    const s1: KSONScene = {
      meta: { id: "s1", assets: { shared: "shared.png", a: "a.png" } },
      script: "",
      actions: [],
    };
    const s2: KSONScene = {
      meta: { id: "s2", assets: { shared: "shared.png", b: "b.png" } },
      script: "",
      actions: [],
    };
    reg.registerFromScene(s1);
    reg.registerFromScene(s2);

    const result = reg.getAssetsForScenes(["s1", "s2"]);
    expect(result).toContain("shared");
    expect(result).toContain("a");
    expect(result).toContain("b");
    // "shared" should appear only once
    expect(result.filter((x) => x === "shared")).toHaveLength(1);
  });

  test("engine emits 'preload' event when registry is configured", () => {
    const scene: KSONScene = {
      meta: { id: "preload-test", assets: { bg: "bg.png" } },
      script: "",
      actions: [{ type: "text", speaker: "N", content: "Hi" }],
    };

    const reg = new AssetRegistry();
    reg.registerFromScene(scene);

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.setAssetRegistry(reg);

    const preloaded: string[][] = [];
    engine.on("preload", (ids: string[]) => preloaded.push(ids));

    engine.start("preload-test");

    expect(preloaded).toHaveLength(1);
    expect(preloaded[0]).toContain("bg");
  });
});
