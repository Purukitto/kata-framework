import { expect, test, describe, beforeEach, mock } from "bun:test";
import { AssetPipeline } from "../src/assets/pipeline";
import { AssetRegistry } from "../src/assets/index";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene } from "../src/types";

function setupMockFetch() {
  (globalThis as any).fetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
      blob: () => Promise.resolve(new Blob()),
    })
  );
}

describe("Asset Engine Integration", () => {
  beforeEach(() => {
    setupMockFetch();
  });

  test("AssetPipeline preloads on engine preload event", async () => {
    const scene: KSONScene = {
      meta: {
        id: "forest",
        assets: { bg: "forest.jpg", music: "forest-theme.mp3" },
      },
      script: "",
      actions: [
        { type: "visual", layer: "background", src: "forest.jpg" },
        { type: "text", speaker: "Narrator", content: "Welcome to the forest." },
      ],
    };

    const engine = new KataEngine({});
    const registry = new AssetRegistry();
    registry.registerFromScene(scene);
    engine.setAssetRegistry(registry);

    engine.registerScene(scene);

    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const preloadedIds: string[][] = [];

    engine.on("preload", (ids: string[]) => {
      preloadedIds.push(ids);
      pipeline.preload(ids);
    });

    engine.start("forest");

    // Preload event should have fired with asset IDs
    expect(preloadedIds).toHaveLength(1);
    expect(preloadedIds[0]!.length).toBeGreaterThan(0);
  });

  test("pipeline integrates with AssetRegistry for scene assets", async () => {
    const scene: KSONScene = {
      meta: {
        id: "cave",
        assets: { bg: "cave.png", ambience: "drip.mp3" },
      },
      script: "",
      actions: [
        { type: "text", speaker: "Explorer", content: "It's dark in here." },
      ],
    };

    const registry = new AssetRegistry();
    registry.registerFromScene(scene);

    const assets = registry.getAssetsForScene("cave");
    expect(assets.length).toBeGreaterThan(0);

    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(assets);
    await handle.complete;

    // All assets should now be loaded
    for (const id of assets) {
      expect(pipeline.isLoaded(id)).toBe(true);
    }
  });

  test("preload completes before scene interaction", async () => {
    setupMockFetch();
    const pipeline = new AssetPipeline({ basePath: "/assets/" });

    const handle = pipeline.preload(["bg.png", "music.mp3", "data.json"]);

    let loaded = 0;
    handle.onProgress((l) => {
      loaded = l;
    });

    const result = await handle.complete;

    expect(loaded).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(pipeline.isLoaded("bg.png")).toBe(true);
    expect(pipeline.isLoaded("music.mp3")).toBe(true);
  });
});
