import { expect, test, describe } from "bun:test";
import { contentWarningsPlugin } from "../src/plugins/content-warnings";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("content warnings — basic", () => {
  test("onWarn fires before entering a tagged scene", () => {
    const warned: { sceneId: string; tags: string[] }[] = [];
    const scene = makeScene("dark-forest", [
      { type: "text", speaker: "A", content: "Scary" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { "dark-forest": ["horror", "violence"] },
        onWarn: (id, tags) => warned.push({ sceneId: id, tags }),
      })
    );
    engine.registerScene(scene);
    engine.start("dark-forest");

    expect(warned).toHaveLength(1);
    expect(warned[0].sceneId).toBe("dark-forest");
    expect(warned[0].tags).toContain("horror");
    expect(warned[0].tags).toContain("violence");
  });

  test("onWarn does NOT fire for untagged scenes", () => {
    const warned: string[] = [];
    const scene = makeScene("peaceful-town", [
      { type: "text", speaker: "A", content: "Nice" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { "dark-forest": ["horror"] },
        onWarn: (id) => warned.push(id),
      })
    );
    engine.registerScene(scene);
    engine.start("peaceful-town");

    expect(warned).toHaveLength(0);
  });

  test("multiple tags are passed as an array", () => {
    let receivedTags: string[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);

    const engine = new KataEngine();
    engine.use(
      contentWarningsPlugin({
        warnings: { s1: ["a", "b", "c"] },
        onWarn: (_id, tags) => {
          receivedTags = tags;
        },
      })
    );
    engine.registerScene(scene);
    engine.start("s1");

    expect(receivedTags).toHaveLength(3);
    expect(receivedTags).toContain("a");
    expect(receivedTags).toContain("b");
    expect(receivedTags).toContain("c");
  });

  test("getWarnings returns tags for a given scene", () => {
    const plugin = contentWarningsPlugin({
      warnings: { s1: ["horror"], s2: ["romance"] },
      onWarn: () => {},
    });

    expect(plugin.getWarnings("s1")).toEqual(["horror"]);
    expect(plugin.getWarnings("s2")).toEqual(["romance"]);
    expect(plugin.getWarnings("s3")).toEqual([]);
  });
});
