import { expect, test, describe } from "bun:test";
import { AssetCache } from "../src/assets/pipeline";

describe("Asset Cache", () => {
  test("second request for the same URL returns cached result", () => {
    const cache = new AssetCache();
    const data = { type: "image", width: 100 };
    cache.set("/assets/bg.png", data);

    expect(cache.get("/assets/bg.png")).toBe(data);
    expect(cache.get("/assets/bg.png")).toBe(data); // Same reference
  });

  test("cache.clear() evicts all entries", () => {
    const cache = new AssetCache();
    cache.set("a.png", "a");
    cache.set("b.png", "b");
    cache.set("c.png", "c");

    expect(cache.size).toBe(3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a.png")).toBeUndefined();
  });

  test("cache.evict(url) removes a single entry", () => {
    const cache = new AssetCache();
    cache.set("a.png", "a");
    cache.set("b.png", "b");

    cache.evict("a.png");
    expect(cache.has("a.png")).toBe(false);
    expect(cache.has("b.png")).toBe(true);
    expect(cache.size).toBe(1);
  });

  test("memory cache enforces max size (LRU eviction)", () => {
    const cache = new AssetCache(3);
    cache.set("a.png", "a");
    cache.set("b.png", "b");
    cache.set("c.png", "c");

    // Access 'a' to make it most recently used
    cache.get("a.png");

    // Adding 'd' should evict 'b' (LRU)
    cache.set("d.png", "d");

    expect(cache.has("a.png")).toBe(true); // recently used
    expect(cache.has("b.png")).toBe(false); // evicted
    expect(cache.has("c.png")).toBe(true);
    expect(cache.has("d.png")).toBe(true);
    expect(cache.size).toBe(3);
  });

  test("updating existing key does not increase size", () => {
    const cache = new AssetCache(5);
    cache.set("a.png", "v1");
    cache.set("a.png", "v2");

    expect(cache.size).toBe(1);
    expect(cache.get("a.png")).toBe("v2");
  });
});
