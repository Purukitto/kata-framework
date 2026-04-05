import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const pluginsDir = join(__dirname, "..", "src", "plugins");

describe("plugin isolation", () => {
  test("analytics plugin does not import other plugins", () => {
    const src = readFileSync(join(pluginsDir, "analytics.ts"), "utf-8");
    expect(src).not.toContain("./profanity");
    expect(src).not.toContain("./auto-save");
    expect(src).not.toContain("./logger");
    expect(src).not.toContain("./content-warnings");
    expect(src).not.toContain("./validate");
  });

  test("profanity plugin does not import other plugins", () => {
    const src = readFileSync(join(pluginsDir, "profanity.ts"), "utf-8");
    expect(src).not.toContain("./analytics");
    expect(src).not.toContain("./auto-save");
    expect(src).not.toContain("./logger");
    expect(src).not.toContain("./content-warnings");
    expect(src).not.toContain("./validate");
  });

  test("validate utility does not import other plugins", () => {
    const src = readFileSync(join(pluginsDir, "validate.ts"), "utf-8");
    expect(src).not.toContain("./analytics");
    expect(src).not.toContain("./profanity");
    expect(src).not.toContain("./auto-save");
    expect(src).not.toContain("./logger");
    expect(src).not.toContain("./content-warnings");
  });

  test("each plugin only depends on core types and runtime/plugin", () => {
    const allowedImports = ["../types", "../runtime/plugin"];
    const pluginFiles = ["analytics.ts", "profanity.ts", "validate.ts"];

    for (const file of pluginFiles) {
      const src = readFileSync(join(pluginsDir, file), "utf-8");
      const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      for (const imp of imports) {
        const isAllowed = allowedImports.some((a) => imp === a);
        expect(isAllowed).toBe(true);
      }
    }
  });
});
