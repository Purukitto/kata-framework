import { parseKata } from "./index";
import type { KSONScene, KSONAction, Diagnostic } from "../types";

/**
 * Parses a .kata file and returns both the scene and any diagnostics.
 */
export function parseKataWithDiagnostics(source: string): {
  scene: KSONScene;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];

  // Pre-parse checks on raw source
  preValidate(source, diagnostics);

  let scene: KSONScene;
  try {
    scene = parseKata(source);
  } catch (error) {
    diagnostics.push({
      level: "error",
      message: `Parse failure: ${error instanceof Error ? error.message : String(error)}`,
    });
    return {
      scene: { meta: { id: "unknown" }, script: "", actions: [] },
      diagnostics,
    };
  }

  // Validate missing id
  if (!scene.meta.id || scene.meta.id === "unknown") {
    diagnostics.push({
      level: "warning",
      message: "Missing `id` in frontmatter",
      sceneId: "unknown",
    });
  }

  // Validate conditions and interpolations in actions
  validateActions(scene.actions, scene.meta.id, source, diagnostics);

  return { scene, diagnostics };
}

/**
 * Pre-parse validation on the raw source text.
 */
function preValidate(source: string | null, diagnostics: Diagnostic[]): void {
  if (!source) return;
  // Check for unclosed [exec] blocks
  const hasExecOpen = /\[exec\]/.test(source);
  const hasExecClose = /\[\/exec\]/.test(source);
  if (hasExecOpen && !hasExecClose) {
    const line = findLineNumber(source, "[exec]");
    diagnostics.push({
      level: "error",
      message: "Unclosed [exec] block — missing [/exec]",
      line,
    });
  }

  // Check for unclosed [tween-group] blocks
  const hasTweenGroupOpen = /\[tween-group\s/.test(source);
  const hasTweenGroupClose = /\[\/tween-group\]/.test(source);
  if (hasTweenGroupOpen && !hasTweenGroupClose) {
    const line = findLineNumber(source, "[tween-group");
    diagnostics.push({
      level: "error",
      message: "Unclosed [tween-group] block — missing [/tween-group]",
      line,
    });
  }

  // Check for orphaned :::else or :::elseif without :::if
  const lines = source.split("\n");
  let insideIf = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed.startsWith(":::if")) insideIf++;
    if (trimmed === ":::" && insideIf > 0) insideIf--;
    if (
      (trimmed.startsWith(":::else") || trimmed.startsWith(":::elseif")) &&
      insideIf === 0
    ) {
      diagnostics.push({
        level: "error",
        message: `:::${trimmed.startsWith(":::elseif") ? "elseif" : "else"} without preceding :::if`,
        line: i + 1,
      });
    }
  }
}

function validateActions(
  actions: KSONAction[],
  sceneId: string,
  source: string,
  diagnostics: Diagnostic[]
): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;

    if (action.type === "condition") {
      // Validate condition expression syntax
      try {
        new Function(`return ${action.condition}`);
      } catch {
        const line = findLineNumber(source, action.condition);
        diagnostics.push({
          level: "error",
          message: `Invalid condition expression: ${action.condition}`,
          sceneId,
          line,
          actionIndex: i,
        });
      }
      // Recurse into then-block
      validateActions(action.then, sceneId, source, diagnostics);

      // Recurse into elseIf branches
      if (action.elseIf) {
        for (const branch of action.elseIf) {
          try {
            new Function(`return ${branch.condition}`);
          } catch {
            const line = findLineNumber(source, branch.condition);
            diagnostics.push({
              level: "error",
              message: `Invalid condition expression: ${branch.condition}`,
              sceneId,
              line,
              actionIndex: i,
            });
          }
          validateActions(branch.then, sceneId, source, diagnostics);
        }
      }

      // Recurse into else branch
      if (action.else) {
        validateActions(action.else, sceneId, source, diagnostics);
      }
    }

    if (action.type === "tween") {
      if (!action.target) {
        diagnostics.push({
          level: "warning",
          message: "[tween] directive missing target",
          sceneId,
          actionIndex: i,
        });
      }
      if (!action.duration) {
        diagnostics.push({
          level: "warning",
          message: "[tween] directive missing duration",
          sceneId,
          actionIndex: i,
        });
      }
      if (action.to === undefined || isNaN(action.to)) {
        diagnostics.push({
          level: "warning",
          message: "[tween] directive missing or invalid 'to' value",
          sceneId,
          actionIndex: i,
        });
      }
    }

    if (action.type === "tween-group") {
      if (!action.tweens || action.tweens.length === 0) {
        diagnostics.push({
          level: "warning",
          message: "[tween-group] contains no tweens",
          sceneId,
          actionIndex: i,
        });
      }
    }

    if (action.type === "wait" && action.duration === 0) {
      diagnostics.push({
        level: "warning",
        message: "[wait] directive missing duration value",
        sceneId,
        actionIndex: i,
      });
    }

    if (action.type === "text") {
      // Check for broken interpolation patterns
      const matches = action.content.matchAll(/\$\{([^}]*)\}/g);
      for (const match of matches) {
        const expr = match[1]?.trim();
        if (!expr) {
          diagnostics.push({
            level: "warning",
            message: `Empty interpolation expression \${}`,
            sceneId,
            actionIndex: i,
          });
        }
      }
    }
  }
}

function findLineNumber(source: string, needle: string): number | undefined {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(needle)) {
      return i + 1;
    }
  }
  return undefined;
}
