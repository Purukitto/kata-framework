import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { scaffold } from "../index";
import { existsSync, readFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDir = join(tmpdir(), `kata-scaffold-test-${Date.now()}`);

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("scaffold output", () => {
  test("creates expected directory structure", () => {
    const result = scaffold("my-plugin", testDir);
    expect(result.success).toBe(true);

    const dir = result.dir;
    expect(existsSync(join(dir, "src", "index.ts"))).toBe(true);
    expect(existsSync(join(dir, "tests", "index.test.ts"))).toBe(true);
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(existsSync(join(dir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(dir, "tsup.config.ts"))).toBe(true);
    expect(existsSync(join(dir, "README.md"))).toBe(true);
  });

  test("package.json has correct name and peer deps", () => {
    const result = scaffold("awesome", testDir);
    expect(result.success).toBe(true);
    expect(result.packageName).toBe("kata-plugin-awesome");

    const pkg = JSON.parse(readFileSync(join(result.dir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("kata-plugin-awesome");
    expect(pkg.peerDependencies["@kata-framework/core"]).toBeDefined();
    expect(pkg.devDependencies["@kata-framework/test-utils"]).toBeDefined();
  });

  test("package.json has build config", () => {
    const result = scaffold("test-plug", testDir);
    const pkg = JSON.parse(readFileSync(join(result.dir, "package.json"), "utf-8"));
    expect(pkg.scripts.build).toBe("tsup");
    expect(pkg.scripts.test).toBe("bun test");
    expect(pkg.main).toContain("dist");
    expect(pkg.types).toContain(".d.ts");
  });

  test("generated plugin source has correct factory name", () => {
    const result = scaffold("my-cool-plugin", testDir);
    const src = readFileSync(join(result.dir, "src", "index.ts"), "utf-8");
    expect(src).toContain("myCoolPluginPlugin");
    expect(src).toContain("MyCoolPlugin");
    expect(src).toContain('name: "kata-plugin-my-cool-plugin"');
  });

  test("generated test references the plugin factory", () => {
    const result = scaffold("my-plug", testDir);
    const testSrc = readFileSync(join(result.dir, "tests", "index.test.ts"), "utf-8");
    expect(testSrc).toContain("myPlugPlugin");
    expect(testSrc).toContain("name");
  });

  test("fails if directory already exists", () => {
    scaffold("dupe", testDir);
    const result = scaffold("dupe", testDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });
});
