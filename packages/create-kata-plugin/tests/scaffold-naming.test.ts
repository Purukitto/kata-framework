import { expect, test, describe } from "bun:test";
import { normalizeName, validateName, scaffold } from "../index";
import { rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("scaffold naming", () => {
  test("input is normalized to lowercase with hyphens", () => {
    expect(normalizeName("My Plugin")).toBe("my-plugin");
    expect(normalizeName("  spaces  ")).toBe("spaces");
    expect(normalizeName("UPPERCASE")).toBe("uppercase");
  });

  test("strips existing kata-plugin- prefix to avoid doubling", () => {
    expect(normalizeName("kata-plugin-foo")).toBe("foo");
    expect(normalizeName("kata-plugin-my-plugin")).toBe("my-plugin");
  });

  test("valid names pass validation", () => {
    expect(validateName("my-plugin")).toBeNull();
    expect(validateName("plugin123")).toBeNull();
    expect(validateName("a")).toBeNull();
  });

  test("empty name is rejected", () => {
    expect(validateName("")).not.toBeNull();
  });

  test("names with special characters are rejected", () => {
    expect(validateName("my_plugin")).not.toBeNull();
    expect(validateName("my.plugin")).not.toBeNull();
    expect(validateName("my plugin")).not.toBeNull();
    expect(validateName("my@plugin")).not.toBeNull();
  });

  test("names with uppercase are rejected", () => {
    expect(validateName("MyPlugin")).not.toBeNull();
  });

  test("scaffold normalizes input name end-to-end", () => {
    const testDir = join(tmpdir(), `kata-name-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    try {
      const result = scaffold("My Cool Plugin", testDir);
      expect(result.success).toBe(true);
      expect(result.packageName).toBe("kata-plugin-my-cool-plugin");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("scaffold rejects invalid names with error message", () => {
    const result = scaffold("bad@name!");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
