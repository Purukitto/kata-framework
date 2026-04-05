import { expect, test, describe } from "bun:test";

describe("plugin subpath exports", () => {
  test("main entry does NOT export analyticsPlugin", () => {
    const main = require("../index");
    expect(main.analyticsPlugin).toBeUndefined();
  });

  test("main entry still exports KataEngine and core API", () => {
    const main = require("../index");
    expect(main.KataEngine).toBeDefined();
    expect(main.parseKata).toBeDefined();
    expect(main.createGameStore).toBeDefined();
  });

  test("analytics plugin importable from subpath", async () => {
    const mod = await import("../src/plugins/analytics");
    expect(mod.analyticsPlugin).toBeDefined();
    expect(typeof mod.analyticsPlugin).toBe("function");
  });

  test("profanity plugin importable from subpath", async () => {
    const mod = await import("../src/plugins/profanity");
    expect(mod.profanityPlugin).toBeDefined();
    expect(typeof mod.profanityPlugin).toBe("function");
  });

  test("validate utility importable from subpath", async () => {
    const mod = await import("../src/plugins/validate");
    expect(mod.validatePlugin).toBeDefined();
    expect(typeof mod.validatePlugin).toBe("function");
  });

  test("analytics plugin factory returns valid plugin", async () => {
    const { analyticsPlugin } = await import("../src/plugins/analytics");
    const plugin = analyticsPlugin();
    expect(plugin.name).toBe("analytics");
    expect(typeof plugin.getReport).toBe("function");
  });

  test("profanity plugin factory returns valid plugin", async () => {
    const { profanityPlugin } = await import("../src/plugins/profanity");
    const plugin = profanityPlugin({ words: ["test"] });
    expect(plugin.name).toBe("profanity-filter");
    expect(typeof plugin.addWords).toBe("function");
  });
});
