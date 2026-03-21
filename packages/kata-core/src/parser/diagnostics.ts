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
