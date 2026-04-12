import { expect, test, describe, mock } from "bun:test";
import { AssetPipeline } from "../src/assets/pipeline";

describe("Asset Concurrency", () => {
  test("no more than maxConcurrent fetches are in-flight simultaneously", async () => {
    let peakConcurrent = 0;
    let currentConcurrent = 0;

    (globalThis as any).fetch = mock(() => {
      currentConcurrent++;
      if (currentConcurrent > peakConcurrent) {
        peakConcurrent = currentConcurrent;
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          currentConcurrent--;
          resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
            blob: () => Promise.resolve(new Blob()),
          });
        }, 10);
      });
    });

    const pipeline = new AssetPipeline({
      basePath: "/assets/",
      maxConcurrent: 2,
    });

    const handle = pipeline.preload([
      "a.png",
      "b.png",
      "c.png",
      "d.png",
      "e.png",
    ]);

    await handle.complete;

    expect(peakConcurrent).toBeLessThanOrEqual(2);
  });

  test("queued fetches are processed as in-flight ones complete", async () => {
    const fetchOrder: string[] = [];

    (globalThis as any).fetch = mock((url: string) => {
      fetchOrder.push(url);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
            blob: () => Promise.resolve(new Blob()),
          });
        }, 5);
      });
    });

    const pipeline = new AssetPipeline({
      basePath: "",
      maxConcurrent: 2,
    });

    const handle = pipeline.preload(["a.png", "b.png", "c.png", "d.png"]);
    await handle.complete;

    // All 4 should have been fetched
    expect(fetchOrder).toHaveLength(4);
  });

  test("cached assets bypass the fetch queue", async () => {
    let fetchCount = 0;

    (globalThis as any).fetch = mock(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
        blob: () => Promise.resolve(new Blob()),
      });
    });

    const pipeline = new AssetPipeline({
      basePath: "/assets/",
      maxConcurrent: 2,
    });

    // First load
    const handle1 = pipeline.preload(["a.png", "b.png"]);
    await handle1.complete;
    expect(fetchCount).toBe(2);

    // Second load — should use cache
    const handle2 = pipeline.preload(["a.png", "b.png", "c.png"]);
    await handle2.complete;
    expect(fetchCount).toBe(3); // Only c.png fetched
  });
});
