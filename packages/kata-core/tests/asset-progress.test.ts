import { expect, test, describe, beforeEach, mock } from "bun:test";
import { AssetPipeline } from "../src/assets/pipeline";

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

describe("Asset Progress", () => {
  beforeEach(() => {
    setupMockFetch();
  });

  test("onProgress fires for each completed asset", async () => {
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["a.png", "b.png", "c.png"]);

    const progress: Array<[number, number]> = [];
    handle.onProgress((loaded, total) => progress.push([loaded, total]));

    await handle.complete;

    expect(progress).toHaveLength(3);
    // Total should always be 3
    for (const [, total] of progress) {
      expect(total).toBe(3);
    }
  });

  test("progress goes from 0 to total", async () => {
    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["a.png", "b.mp3"]);

    const loadedValues: number[] = [];
    handle.onProgress((loaded) => loadedValues.push(loaded));

    await handle.complete;

    // Should end at total (2)
    expect(loadedValues[loadedValues.length - 1]).toBe(2);
    // All values should be monotonically increasing
    for (let i = 1; i < loadedValues.length; i++) {
      expect(loadedValues[i]!).toBeGreaterThanOrEqual(loadedValues[i - 1]!);
    }
  });

  test("partial failures still report progress for successful items", async () => {
    let callCount = 0;
    (globalThis as any).fetch = mock(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
        blob: () => Promise.resolve(new Blob()),
      });
    });

    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["a.png", "b.png", "c.png"]);

    const progress: Array<[number, number]> = [];
    handle.onProgress((loaded, total) => progress.push([loaded, total]));

    const result = await handle.complete;

    // Progress should still fire for all 3 (including the failed one)
    expect(progress).toHaveLength(3);
    // One error
    expect(result.errors).toHaveLength(1);
  });

  test("complete promise resolves even if some assets fail", async () => {
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 })
    );

    const pipeline = new AssetPipeline({ basePath: "/assets/" });
    const handle = pipeline.preload(["a.png", "b.png"]);

    const result = await handle.complete;

    expect(result.errors).toHaveLength(2);
    // Should still resolve, not reject
    expect(result.errors[0]!.url).toBe("a.png");
    expect(result.errors[1]!.url).toBe("b.png");
  });
});
