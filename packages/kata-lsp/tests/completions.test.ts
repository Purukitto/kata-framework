import { expect, test, describe, beforeEach } from "bun:test";
import { WorkspaceIndex } from "../src/workspace";
import { getCompletions } from "../src/completions";

let index: WorkspaceIndex;

beforeEach(() => {
  index = new WorkspaceIndex();
  index.updateFile(
    "file:///forest.kata",
    `---\nid: forest\nassets:\n  bg: forest.jpg\n---\n<script>\nctx.gold = 100;\nctx.name = "Hero";\n</script>\n:: Narrator :: Hello\n`
  );
  index.updateFile(
    "file:///town.kata",
    `---\nid: town\nassets:\n  music: town.mp3\n---\n:: Merchant :: Welcome\n`
  );
});

describe("LSP Completions", () => {
  test("completes scene IDs from workspace after -> @", () => {
    const content = `---\nid: start\n---\n* [Go] -> @`;
    const items = getCompletions(content, 3, 14, index);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => i.label === "forest" && i.kind === "scene")).toBe(true);
    expect(items.some((i) => i.label === "town" && i.kind === "scene")).toBe(true);
  });

  test("completes variable names in ${...}", () => {
    const content = `---\nid: test\n---\n:: Narrator :: Hello \${`;
    const items = getCompletions(content, 3, 23, index);
    expect(items.some((i) => i.label === "gold" && i.kind === "variable")).toBe(true);
    expect(items.some((i) => i.label === "name" && i.kind === "variable")).toBe(true);
  });

  test("completes asset keys in [bg src=\"...\"]", () => {
    const content = `---\nid: test\n---\n[bg src="`;
    const items = getCompletions(content, 3, 9, index);
    expect(items.some((i) => i.label === "bg" && i.kind === "asset")).toBe(true);
    expect(items.some((i) => i.label === "music" && i.kind === "asset")).toBe(true);
  });
});
