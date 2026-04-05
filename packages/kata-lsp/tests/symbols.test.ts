import { expect, test, describe, beforeEach } from "bun:test";
import { WorkspaceIndex } from "../src/workspace";
import { getDocumentSymbols } from "../src/symbols";

let index: WorkspaceIndex;

beforeEach(() => {
  index = new WorkspaceIndex();
});

describe("LSP Document Symbols", () => {
  test("returns scene ID, speaker names, and choice labels as document symbols", () => {
    const content = `---
id: intro
---
:: Narrator :: Welcome!

:: Hero :: Thank you.

* [Fight] -> @battle
* [Flee] -> @escape
`;
    const uri = "file:///intro.kata";
    index.updateFile(uri, content);
    const symbols = getDocumentSymbols(content, uri, index);

    // Scene ID
    expect(symbols.some((s) => s.name === "intro" && s.kind === "module")).toBe(true);

    // Speakers
    expect(symbols.some((s) => s.name === "Narrator" && s.kind === "function")).toBe(true);
    expect(symbols.some((s) => s.name === "Hero" && s.kind === "function")).toBe(true);

    // Choices
    expect(symbols.some((s) => s.name === "Fight" && s.kind === "property")).toBe(true);
    expect(symbols.some((s) => s.name === "Flee" && s.kind === "property")).toBe(true);
  });
});
