import { expect, test, describe, beforeEach } from "bun:test";
import { WorkspaceIndex } from "../src/workspace";
import { getDiagnostics } from "../src/diagnostics";

let index: WorkspaceIndex;

beforeEach(() => {
  index = new WorkspaceIndex();
});

describe("LSP Diagnostics", () => {
  test("reports undefined variable in ${undeclaredVar}", () => {
    // This test checks that kata-core's diagnostics pass through
    const content = `---
id: test
---
:: Narrator :: Hello \${} world
`;
    const diags = getDiagnostics("file:///test.kata", content, index);
    expect(diags.some((d) => d.message.includes("interpolation"))).toBe(true);
  });

  test("reports unresolved scene target -> @nonexistent/scene", () => {
    const content = `---
id: start
---
* [Go] -> @nonexistent/scene
`;
    const diags = getDiagnostics("file:///start.kata", content, index);
    expect(
      diags.some(
        (d) => d.message.includes("Unresolved") && d.message.includes("nonexistent/scene")
      )
    ).toBe(true);
  });

  test("reports duplicate scene IDs across files", () => {
    index.updateFile("file:///a.kata", `---\nid: intro\n---\n:: N :: Hello\n`);

    const content = `---\nid: intro\n---\n:: N :: World\n`;
    const diags = getDiagnostics("file:///b.kata", content, index);
    expect(diags.some((d) => d.message.includes("Duplicate scene ID"))).toBe(true);
  });

  test("reports syntax error in cond (invalid expression)", () => {
    const content = `---
id: test
---
:::if{cond="if =="}
:: N :: Never shown
:::
`;
    const diags = getDiagnostics("file:///test.kata", content, index);
    expect(diags.some((d) => d.message.includes("condition") || d.message.includes("expression"))).toBe(true);
  });

  test("no false positives on valid .kata files", () => {
    const content = `---
id: valid-scene
---
:: Narrator :: Hello world
`;
    const diags = getDiagnostics("file:///valid.kata", content, index);
    expect(diags).toHaveLength(0);
  });
});
