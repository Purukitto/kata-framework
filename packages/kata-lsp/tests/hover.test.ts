import { expect, test, describe, beforeEach } from "bun:test";
import { WorkspaceIndex } from "../src/workspace";
import { getHover } from "../src/hover";

let index: WorkspaceIndex;

beforeEach(() => {
  index = new WorkspaceIndex();
  index.updateFile(
    "file:///forest.kata",
    `---\nid: forest\nassets:\n  bg: forest.jpg\n---\n<script>\nctx.gold = 100;\n</script>\n:: Narrator :: You have \${gold} gold\n`
  );
});

describe("LSP Hover", () => {
  test("shows variable info on ${player.gold} hover", () => {
    const content = `:: Narrator :: You have \${gold} gold`;
    // Cursor on "gold" inside ${gold} — position after ${ is at char 25
    const result = getHover(content, 0, 26, index);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain("ctx.gold");
    expect(result!.contents).toContain("Context variable");
  });

  test("shows asset URL on [bg src=\"forest.jpg\"] hover", () => {
    const content = `[bg src="bg"]`;
    const result = getHover(content, 0, 10, index);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain("bg");
  });
});
