import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { graph } from "../src/commands/graph";
import { rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const TMP_DIR = resolve(import.meta.dir, "__tmp_graph__");
const INPUT_DIR = resolve(TMP_DIR, "scenes");

const START_KATA = `---
id: start
---
:: Narrator :: Welcome

* [Go to forest] -> @forest
* [Go to town] -> @town
`;

const FOREST_KATA = `---
id: forest
---
:: Narrator :: You enter the forest.

* [Go deeper] -> @deep_forest
`;

const TOWN_KATA = `---
id: town
---
:: Narrator :: The town is quiet.
`;

const DEEP_FOREST_KATA = `---
id: deep_forest
---
:: Narrator :: It's dark here.
`;

const ORPHAN_KATA = `---
id: secret
---
:: Narrator :: You found a secret!
`;

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(INPUT_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("graph command", () => {
  test("DOT output contains correct nodes and edges", async () => {
    await Bun.write(resolve(INPUT_DIR, "start.kata"), START_KATA);
    await Bun.write(resolve(INPUT_DIR, "forest.kata"), FOREST_KATA);
    await Bun.write(resolve(INPUT_DIR, "town.kata"), TOWN_KATA);
    await Bun.write(resolve(INPUT_DIR, "deep.kata"), DEEP_FOREST_KATA);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(" "));

    try {
      await graph("scenes/**/*.kata", { format: "dot", lint: false });
    } finally {
      process.chdir(origCwd);
      console.log = origLog;
    }

    const dot = output.join("\n");
    expect(dot).toContain("digraph {");
    expect(dot).toContain('"start" -> "forest"');
    expect(dot).toContain('"start" -> "town"');
    expect(dot).toContain('"forest" -> "deep_forest"');
  });

  test("JSON output matches expected shape", async () => {
    await Bun.write(resolve(INPUT_DIR, "start.kata"), START_KATA);
    await Bun.write(resolve(INPUT_DIR, "forest.kata"), FOREST_KATA);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(" "));

    try {
      await graph("scenes/**/*.kata", { format: "json", lint: false });
    } finally {
      process.chdir(origCwd);
      console.log = origLog;
    }

    const json = JSON.parse(output.join("\n"));
    expect(json.nodes).toBeDefined();
    expect(json.edges).toBeDefined();
    expect(json.nodes.length).toBeGreaterThanOrEqual(2);
    expect(json.edges.some((e: any) => e.from === "start" && e.to === "forest")).toBe(true);
  });

  test("--lint detects orphaned scenes", async () => {
    await Bun.write(resolve(INPUT_DIR, "start.kata"), START_KATA);
    await Bun.write(resolve(INPUT_DIR, "forest.kata"), FOREST_KATA);
    await Bun.write(resolve(INPUT_DIR, "town.kata"), TOWN_KATA);
    await Bun.write(resolve(INPUT_DIR, "deep.kata"), DEEP_FOREST_KATA);
    await Bun.write(resolve(INPUT_DIR, "orphan.kata"), ORPHAN_KATA);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);

    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(" "));

    try {
      await graph("scenes/**/*.kata", { format: "dot", lint: true });
    } finally {
      process.chdir(origCwd);
      console.warn = origWarn;
    }

    expect(warnings.some((w) => w.includes("secret") && w.includes("Orphaned"))).toBe(true);
  });

  test("--lint detects dead-end scenes", async () => {
    await Bun.write(resolve(INPUT_DIR, "start.kata"), START_KATA);
    await Bun.write(resolve(INPUT_DIR, "town.kata"), TOWN_KATA);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);

    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(" "));

    try {
      await graph("scenes/**/*.kata", { format: "dot", lint: true });
    } finally {
      process.chdir(origCwd);
      console.warn = origWarn;
    }

    expect(warnings.some((w) => w.includes("town") && w.includes("Dead end"))).toBe(true);
  });

  test("handles cycles without infinite output", async () => {
    const cycleA = `---\nid: a\n---\n* [Go B] -> @b\n`;
    const cycleB = `---\nid: b\n---\n* [Go A] -> @a\n`;

    await Bun.write(resolve(INPUT_DIR, "a.kata"), cycleA);
    await Bun.write(resolve(INPUT_DIR, "b.kata"), cycleB);

    const origCwd = process.cwd();
    process.chdir(TMP_DIR);

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(" "));

    try {
      await graph("scenes/**/*.kata", { format: "json", lint: false });
    } finally {
      process.chdir(origCwd);
      console.log = origLog;
    }

    const json = JSON.parse(output.join("\n"));
    expect(json.nodes).toHaveLength(2);
    expect(json.edges).toHaveLength(2);
  });
});
