import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { build } from "../src/commands/build";
import { resolveConfig } from "../src/config";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TMP_DIR = resolve(import.meta.dir, "__tmp__");
const INPUT_DIR = resolve(TMP_DIR, "scenes");
const OUTPUT_DIR = resolve(TMP_DIR, "out");

const SAMPLE_KATA = `---
id: test-scene
title: Test Scene
---

:: Narrator ::
Hello, world!

:: Narrator ::
Goodbye, world!
`;

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(INPUT_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("build command", () => {
  test("processes sample .kata files to correct JSON output", async () => {
    await Bun.write(resolve(INPUT_DIR, "demo.kata"), SAMPLE_KATA);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);
    try {
      await build("scenes/**/*.kata", "out");
    } finally {
      process.chdir(origCwd);
    }

    const outFile = resolve(OUTPUT_DIR, "demo.kson.json");
    expect(existsSync(outFile)).toBe(true);

    const parsed = JSON.parse(readFileSync(outFile, "utf-8"));
    expect(parsed.meta.id).toBe("test-scene");
    expect(parsed.meta.title).toBe("Test Scene");
    expect(parsed.actions).toHaveLength(2);
    expect(parsed.actions[0].type).toBe("text");
    expect(parsed.actions[0].content).toBe("Hello, world!");
    expect(parsed.actions[1].content).toBe("Goodbye, world!");
  });

  test("processes multiple .kata files", async () => {
    await Bun.write(resolve(INPUT_DIR, "scene1.kata"), SAMPLE_KATA);
    await Bun.write(
      resolve(INPUT_DIR, "scene2.kata"),
      `---\nid: scene-two\n---\n\n:: Hero ::\nAnother scene.\n`
    );

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);
    try {
      await build("scenes/**/*.kata", "out");
    } finally {
      process.chdir(origCwd);
    }

    expect(existsSync(resolve(OUTPUT_DIR, "scene1.kson.json"))).toBe(true);
    expect(existsSync(resolve(OUTPUT_DIR, "scene2.kson.json"))).toBe(true);

    const scene2 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, "scene2.kson.json"), "utf-8"));
    expect(scene2.meta.id).toBe("scene-two");
  });

  test("empty glob completes without error", async () => {
    const origCwd = process.cwd();
    process.chdir(TMP_DIR);
    try {
      // No .kata files exist in this pattern
      await build("nonexistent/**/*.kata", "out");
    } finally {
      process.chdir(origCwd);
    }
    // Should not throw
  });
});

describe("config resolution", () => {
  test("CLI args override defaults", () => {
    const config = resolveConfig({ input: "my/**/*.kata", output: "build/out" });
    expect(config.input).toBe("my/**/*.kata");
    expect(config.output).toBe("build/out");
  });

  test("defaults are used when no args provided", () => {
    const config = resolveConfig({});
    expect(config.input).toBe("**/*.kata");
    expect(config.output).toBe("dist/kson");
  });

  test("partial args fall back to defaults", () => {
    const config = resolveConfig({ input: "src/**/*.kata" });
    expect(config.input).toBe("src/**/*.kata");
    expect(config.output).toBe("dist/kson");
  });
});
