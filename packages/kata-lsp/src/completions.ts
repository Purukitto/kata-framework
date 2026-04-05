import type { WorkspaceIndex } from "./workspace";

export interface CompletionItem {
  label: string;
  kind: "scene" | "variable" | "asset";
  detail?: string;
}

/**
 * Detects cursor context and returns completions.
 */
export function getCompletions(
  content: string,
  line: number,
  character: number,
  index: WorkspaceIndex
): CompletionItem[] {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";
  const textBefore = currentLine.slice(0, character);

  // After `-> @` — complete scene IDs
  if (textBefore.match(/->\s*@\S*$/)) {
    return index.getSceneIds().map((id) => ({
      label: id,
      kind: "scene" as const,
      detail: "Scene ID",
    }));
  }

  // Inside `${...}` — complete variable names
  if (isInsideInterpolation(textBefore)) {
    return index.getAllVariables().map((v) => ({
      label: v,
      kind: "variable" as const,
      detail: "Context variable",
    }));
  }

  // Inside `cond="..."` — complete variable names
  if (isInsideCondition(textBefore)) {
    return index.getAllVariables().map((v) => ({
      label: v,
      kind: "variable" as const,
      detail: "Context variable",
    }));
  }

  // Inside `[bg src="..."]` — complete asset keys
  if (textBefore.match(/\[bg\s+src="[^"]*$/)) {
    return index.getAllAssetKeys().map((k) => ({
      label: k,
      kind: "asset" as const,
      detail: "Asset key",
    }));
  }

  return [];
}

function isInsideInterpolation(text: string): boolean {
  // Check if cursor is inside an unclosed ${...}
  const lastOpen = text.lastIndexOf("${");
  if (lastOpen === -1) return false;
  const lastClose = text.indexOf("}", lastOpen);
  return lastClose === -1;
}

function isInsideCondition(text: string): boolean {
  // Check if cursor is inside cond="..."
  const condMatch = text.match(/cond="[^"]*$/);
  return !!condMatch;
}
