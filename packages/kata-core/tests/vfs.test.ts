import { expect, test, describe } from "bun:test";
import { LayeredVFS, type VFSProvider } from "../src/vfs/index";

function createProvider(files: Record<string, string>, dirs: Record<string, string[]> = {}): VFSProvider {
  return {
    async readFile(path: string) {
      return files[path] ?? null;
    },
    async listDir(path: string) {
      return dirs[path] ?? [];
    },
  };
}

describe("LayeredVFS", () => {
  test("readFile returns from highest-priority layer", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({ "scene.kata": "base content" }));
    vfs.addLayer("mod", createProvider({ "scene.kata": "mod content" }));

    expect(await vfs.readFile("scene.kata")).toBe("mod content");
  });

  test("readFile falls through when higher layer returns null", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({ "scene.kata": "base content" }));
    vfs.addLayer("mod", createProvider({}));

    expect(await vfs.readFile("scene.kata")).toBe("base content");
  });

  test("readFile returns null when no layer has the file", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({}));

    expect(await vfs.readFile("missing.kata")).toBeNull();
  });

  test("listDir merges and deduplicates entries from all layers", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({}, { "/scenes": ["a.kata", "b.kata"] }));
    vfs.addLayer("mod", createProvider({}, { "/scenes": ["b.kata", "c.kata"] }));

    const result = await vfs.listDir("/scenes");
    expect(result).toEqual(["a.kata", "b.kata", "c.kata"]);
  });

  test("getLayers returns names in priority order", () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({}));
    vfs.addLayer("mod-a", createProvider({}));
    vfs.addLayer("mod-b", createProvider({}));

    expect(vfs.getLayers()).toEqual(["mod-b", "mod-a", "base"]);
  });

  test("removeLayer changes resolution behavior", async () => {
    const vfs = new LayeredVFS();
    vfs.addLayer("base", createProvider({ "f.txt": "base" }));
    vfs.addLayer("mod", createProvider({ "f.txt": "mod" }));

    expect(await vfs.readFile("f.txt")).toBe("mod");

    vfs.removeLayer("mod");
    expect(await vfs.readFile("f.txt")).toBe("base");
    expect(vfs.getLayers()).toEqual(["base"]);
  });

  test("empty VFS returns null / empty array", async () => {
    const vfs = new LayeredVFS();
    expect(await vfs.readFile("anything")).toBeNull();
    expect(await vfs.listDir("/")).toEqual([]);
  });
});
