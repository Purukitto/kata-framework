import type { KSONAction } from "@kata-framework/core";
import type { WorkspaceIndex } from "./workspace";

export interface DocumentSymbol {
  name: string;
  kind: "module" | "function" | "property";
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  children?: DocumentSymbol[];
}

/**
 * Returns document symbols (outline) for a .kata file.
 */
export function getDocumentSymbols(
  content: string,
  uri: string,
  index: WorkspaceIndex
): DocumentSymbol[] {
  const indexed = index.getSceneByUri(uri);
  if (!indexed) return [];

  const symbols: DocumentSymbol[] = [];
  const lines = content.split("\n");

  // Scene ID as module symbol
  const idLine = lines.findIndex((l) => l.includes(`id: ${indexed.scene.meta.id}`));
  symbols.push({
    name: indexed.scene.meta.id,
    kind: "module",
    range: lineRange(Math.max(0, idLine)),
  });

  // Extract speakers and choices from actions
  const speakers = new Set<string>();
  const choiceLabels: Array<{ label: string; line: number }> = [];

  collectSymbolsFromActions(indexed.scene.actions, lines, speakers, choiceLabels);

  // Speaker names as function symbols
  for (const speaker of speakers) {
    const speakerLine = lines.findIndex((l) => l.includes(`:: ${speaker} ::`));
    symbols.push({
      name: speaker,
      kind: "function",
      range: lineRange(Math.max(0, speakerLine)),
    });
  }

  // Choice labels as property symbols
  for (const choice of choiceLabels) {
    symbols.push({
      name: choice.label,
      kind: "property",
      range: lineRange(choice.line),
    });
  }

  return symbols;
}

function collectSymbolsFromActions(
  actions: KSONAction[],
  lines: string[],
  speakers: Set<string>,
  choiceLabels: Array<{ label: string; line: number }>
): void {
  for (const action of actions) {
    if (action.type === "text") {
      speakers.add(action.speaker);
    }
    if (action.type === "choice") {
      for (const choice of action.choices) {
        const line = lines.findIndex((l) => l.includes(`[${choice.label}]`));
        choiceLabels.push({ label: choice.label, line: Math.max(0, line) });
      }
    }
    if (action.type === "condition") {
      collectSymbolsFromActions(action.then, lines, speakers, choiceLabels);
      if (action.elseIf) {
        for (const branch of action.elseIf) {
          collectSymbolsFromActions(branch.then, lines, speakers, choiceLabels);
        }
      }
      if (action.else) {
        collectSymbolsFromActions(action.else, lines, speakers, choiceLabels);
      }
    }
  }
}

function lineRange(line: number) {
  return {
    start: { line, character: 0 },
    end: { line, character: Number.MAX_SAFE_INTEGER },
  };
}
