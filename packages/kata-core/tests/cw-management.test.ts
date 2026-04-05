import { expect, test, describe } from "bun:test";
import { contentWarningsPlugin } from "../src/plugins/content-warnings";

describe("content warnings — management", () => {
  test("addWarning adds tags at runtime", () => {
    const plugin = contentWarningsPlugin({
      warnings: {},
      onWarn: () => {},
    });

    plugin.addWarning("s1", ["horror"]);
    expect(plugin.getWarnings("s1")).toEqual(["horror"]);
  });

  test("tags can be added for scenes not yet registered", () => {
    const plugin = contentWarningsPlugin({
      warnings: {},
      onWarn: () => {},
    });

    plugin.addWarning("future-scene", ["spoilers"]);
    expect(plugin.getWarnings("future-scene")).toEqual(["spoilers"]);
  });

  test("duplicate tags are deduplicated", () => {
    const plugin = contentWarningsPlugin({
      warnings: { s1: ["horror"] },
      onWarn: () => {},
    });

    plugin.addWarning("s1", ["horror", "horror", "violence"]);
    const tags = plugin.getWarnings("s1");
    expect(tags).toHaveLength(2);
    expect(tags).toContain("horror");
    expect(tags).toContain("violence");
  });

  test("removeWarning removes specific tags", () => {
    const plugin = contentWarningsPlugin({
      warnings: { s1: ["horror", "violence", "gore"] },
      onWarn: () => {},
    });

    plugin.removeWarning("s1", ["violence"]);
    const tags = plugin.getWarnings("s1");
    expect(tags).toHaveLength(2);
    expect(tags).toContain("horror");
    expect(tags).toContain("gore");
    expect(tags).not.toContain("violence");
  });

  test("removeWarning for nonexistent scene is a no-op", () => {
    const plugin = contentWarningsPlugin({
      warnings: {},
      onWarn: () => {},
    });

    expect(() => plugin.removeWarning("nope", ["x"])).not.toThrow();
  });

  test("getAllWarnings returns all scene warnings", () => {
    const plugin = contentWarningsPlugin({
      warnings: { s1: ["horror"], s2: ["romance", "mature"] },
      onWarn: () => {},
    });

    const all = plugin.getAllWarnings();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all["s1"]).toEqual(["horror"]);
    expect(all["s2"]).toContain("romance");
    expect(all["s2"]).toContain("mature");
  });
});
