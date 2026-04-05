import type { WorkspaceIndex } from "./workspace";

export interface DefinitionResult {
  uri: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}

/**
 * Returns go-to-definition location for scene targets.
 */
export function getDefinition(
  content: string,
  line: number,
  character: number,
  index: WorkspaceIndex
): DefinitionResult | null {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";

  // Check for -> @scene/id
  const regex = /->\s*@([\w\/_]+)/g;
  let match;
  while ((match = regex.exec(currentLine)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (character >= start && character <= end) {
      const targetId = match[1]!;
      const uri = index.getUriForSceneId(targetId);
      if (uri) {
        return {
          uri,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
        };
      }
    }
  }

  return null;
}
