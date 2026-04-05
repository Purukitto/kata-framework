import type { WorkspaceIndex } from "./workspace";
import type { Diagnostic as KataDiagnostic } from "@kata-framework/core";

export interface LspDiagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity: 1 | 2 | 3 | 4; // Error, Warning, Information, Hint
  message: string;
  source: string;
}

/**
 * Generates LSP diagnostics for a given file URI.
 */
export function getDiagnostics(
  uri: string,
  content: string,
  index: WorkspaceIndex
): LspDiagnostic[] {
  const indexed = index.updateFile(uri, content);
  const diagnostics: LspDiagnostic[] = [];

  // Convert kata-core diagnostics to LSP format
  for (const d of indexed.diagnostics) {
    diagnostics.push(kataDiagToLsp(d, content));
  }

  // Cross-file: unresolved scene targets
  const unresolved = index.getUnresolvedTargets(indexed.scene.meta.id);
  for (const target of unresolved) {
    const line = findLineWithText(content, `@${target}`);
    diagnostics.push({
      range: lineRange(line),
      severity: 1,
      message: `Unresolved scene target: @${target}`,
      source: "kata-lsp",
    });
  }

  // Cross-file: duplicate scene IDs
  const duplicates = index.getDuplicateSceneIds();
  for (const dup of duplicates) {
    if (dup.uris.includes(uri)) {
      const line = findLineWithText(content, `id: ${dup.sceneId}`);
      diagnostics.push({
        range: lineRange(line),
        severity: 1,
        message: `Duplicate scene ID: "${dup.sceneId}" also defined in ${dup.uris.filter((u) => u !== uri).join(", ")}`,
        source: "kata-lsp",
      });
    }
  }

  return diagnostics;
}

function kataDiagToLsp(d: KataDiagnostic, content: string): LspDiagnostic {
  const line = d.line ? d.line - 1 : 0;
  return {
    range: lineRange(line),
    severity: d.level === "error" ? 1 : d.level === "warning" ? 2 : 3,
    message: d.message,
    source: "kata",
  };
}

function findLineWithText(content: string, text: string): number {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(text)) return i;
  }
  return 0;
}

function lineRange(line: number) {
  return {
    start: { line, character: 0 },
    end: { line, character: Number.MAX_SAFE_INTEGER },
  };
}
