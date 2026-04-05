import { expect, test, describe, beforeEach } from "bun:test";
import { WorkspaceIndex } from "../src/workspace";
import { getDefinition } from "../src/definition";

let index: WorkspaceIndex;

beforeEach(() => {
  index = new WorkspaceIndex();
  index.updateFile(
    "file:///forest.kata",
    `---\nid: forest/deep\n---\n:: Narrator :: Deep in the forest\n`
  );
});

describe("LSP Go-to-definition", () => {
  test("navigates from -> @forest/deep to the file containing it", () => {
    const content = `* [Enter] -> @forest/deep`;
    // Cursor on "forest/deep" — starts at char 15
    const result = getDefinition(content, 0, 18, index);
    expect(result).not.toBeNull();
    expect(result!.uri).toBe("file:///forest.kata");
  });
});
