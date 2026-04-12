import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { scaffold, normalizeName, validateName, TEMPLATES } from "../index";
import type { Template } from "../index";
import { existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TMP = join(tmpdir(), "create-kata-test-" + Date.now());

function cleanup() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
}

beforeEach(cleanup);
afterEach(cleanup);

// --- normalizeName ---

describe("normalizeName", () => {
  test("trims and lowercases", () => {
    expect(normalizeName("  My Story  ")).toBe("my-story");
  });

  test("replaces spaces with hyphens", () => {
    expect(normalizeName("my cool story")).toBe("my-cool-story");
  });

  test("passes through valid names", () => {
    expect(normalizeName("my-story")).toBe("my-story");
  });
});

// --- validateName ---

describe("validateName", () => {
  test("returns null for valid names", () => {
    expect(validateName("my-story")).toBeNull();
    expect(validateName("story123")).toBeNull();
  });

  test("rejects empty name", () => {
    expect(validateName("")).toContain("empty");
  });

  test("rejects uppercase", () => {
    expect(validateName("MyStory")).toContain("lowercase");
  });

  test("rejects special characters", () => {
    expect(validateName("my_story")).toContain("lowercase");
    expect(validateName("my story")).toContain("lowercase");
  });
});

// --- scaffold ---

describe("scaffold", () => {
  test("creates minimal project by default", () => {
    const result = scaffold("test-story", { targetDir: TMP });
    expect(result.success).toBe(true);
    expect(result.template).toBe("minimal");
    expect(result.projectName).toBe("test-story");

    // Check files exist
    const dir = result.dir;
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(existsSync(join(dir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(dir, ".gitignore"))).toBe(true);
    expect(existsSync(join(dir, "index.ts"))).toBe(true);
    expect(existsSync(join(dir, "README.md"))).toBe(true);
    expect(existsSync(join(dir, "scenes", "intro.kata"))).toBe(true);
    expect(existsSync(join(dir, "scenes", "chapter1.kata"))).toBe(true);
    expect(existsSync(join(dir, "scenes", "ending.kata"))).toBe(true);
    expect(existsSync(join(dir, "assets"))).toBe(true);
  });

  test("package.json has correct fields for minimal", () => {
    const result = scaffold("my-story", { targetDir: TMP });
    const pkg = JSON.parse(readFileSync(join(result.dir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-story");
    expect(pkg.type).toBe("module");
    expect(pkg.dependencies["@kata-framework/core"]).toBeDefined();
    expect(pkg.dependencies["react"]).toBeUndefined();
    expect(pkg.scripts.dev).toContain("index.ts");
  });

  test("creates react project", () => {
    const result = scaffold("react-story", {
      template: "react",
      targetDir: TMP,
    });
    expect(result.success).toBe(true);
    expect(result.template).toBe("react");

    expect(existsSync(join(result.dir, "src", "index.ts"))).toBe(true);
    expect(existsSync(join(result.dir, "src", "App.tsx"))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(result.dir, "package.json"), "utf-8"));
    expect(pkg.dependencies["react"]).toBeDefined();
    expect(pkg.dependencies["@kata-framework/react"]).toBeDefined();
  });

  test("creates multiplayer project", () => {
    const result = scaffold("mp-story", {
      template: "multiplayer",
      targetDir: TMP,
    });
    expect(result.success).toBe(true);
    expect(result.template).toBe("multiplayer");

    expect(existsSync(join(result.dir, "src", "index.ts"))).toBe(true);
    expect(existsSync(join(result.dir, "src", "App.tsx"))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(result.dir, "package.json"), "utf-8"));
    expect(pkg.dependencies["@kata-framework/sync"]).toBeDefined();
  });

  test("react tsconfig includes jsx", () => {
    const result = scaffold("jsx-story", {
      template: "react",
      targetDir: TMP,
    });
    const tsconfig = JSON.parse(readFileSync(join(result.dir, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
  });

  test("minimal tsconfig has no jsx", () => {
    const result = scaffold("no-jsx", { targetDir: TMP });
    const tsconfig = JSON.parse(readFileSync(join(result.dir, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.jsx).toBeUndefined();
  });

  test("fails on invalid name", () => {
    const result = scaffold("Bad Name!", { targetDir: TMP });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("fails on existing directory", () => {
    scaffold("dup-story", { targetDir: TMP });
    const result = scaffold("dup-story", { targetDir: TMP });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  test("fails on unknown template", () => {
    const result = scaffold("bad-tpl", {
      template: "unknown" as Template,
      targetDir: TMP,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown template");
  });

  test("normalizes input name", () => {
    const result = scaffold("  My Cool Story ", { targetDir: TMP });
    expect(result.success).toBe(true);
    expect(result.projectName).toBe("my-cool-story");
  });

  test("scenes have valid kata format", () => {
    const result = scaffold("kata-check", { targetDir: TMP });
    const intro = readFileSync(join(result.dir, "scenes", "intro.kata"), "utf-8");
    expect(intro).toContain("---");
    expect(intro).toContain("id: intro");
    expect(intro).toContain(":: Narrator ::");
  });

  test("TEMPLATES list is exported", () => {
    expect(TEMPLATES).toContain("minimal");
    expect(TEMPLATES).toContain("react");
    expect(TEMPLATES).toContain("multiplayer");
    expect(TEMPLATES.length).toBe(3);
  });
});
