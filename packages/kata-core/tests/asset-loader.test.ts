import { expect, test, describe, beforeEach, mock } from "bun:test";
import { AssetPipeline } from "../src/assets/pipeline";

function setupMockFetch() {
  (globalThis as any).fetch = mock((url: string) => {
    const ext = url.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "json") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ key: "value", items: [1, 2, 3] }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
        blob: () => Promise.resolve(new Blob()),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      blob: () => Promise.resolve(new Blob(["image-data"])),
    });
  });
}

describe("Asset Loader", () => {
  beforeEach(() => {
    setupMockFetch();
  });

  test("loading an image URL returns a Blob", async () => {
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["bg/forest.jpg"]);
    const result = await handle.complete;

    expect(result.errors).toHaveLength(0);
    expect(pipeline.isLoaded("bg/forest.jpg")).toBe(true);
    const asset = pipeline.get("bg/forest.jpg");
    expect(asset).toBeDefined();
  });

  test("loading an audio URL returns an ArrayBuffer", async () => {
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["audio/wind.mp3"]);
    const result = await handle.complete;

    expect(result.errors).toHaveLength(0);
    expect(pipeline.isLoaded("audio/wind.mp3")).toBe(true);
    const asset = pipeline.get<ArrayBuffer>("audio/wind.mp3");
    expect(asset).toBeInstanceOf(ArrayBuffer);
  });

  test("loading a JSON URL returns parsed JSON", async () => {
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["data/config.json"]);
    const result = await handle.complete;

    expect(result.errors).toHaveLength(0);
    const data = pipeline.get<{ key: string }>("data/config.json");
    expect(data).toEqual({ key: "value", items: [1, 2, 3] });
  });

  test("failed fetch rejects with descriptive error including URL", async () => {
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 })
    );

    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["missing/file.png"]);
    const result = await handle.complete;

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.url).toBe("missing/file.png");
    expect(result.errors[0]!.error.message).toContain("/assets/missing/file.png");
    expect(result.errors[0]!.error.message).toContain("404");
  });

  test("getUrl returns full URL for loaded assets", async () => {
    setupMockFetch();
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["bg/forest.jpg"]);
    await handle.complete;

    expect(pipeline.getUrl("bg/forest.jpg")).toBe("/assets/bg/forest.jpg");
    expect(pipeline.getUrl("nonexistent.png")).toBeUndefined();
  });
});
