import type { WorkspaceIndex } from "./workspace";

export interface HoverResult {
  contents: string;
  range?: { start: { line: number; character: number }; end: { line: number; character: number } };
}

/**
 * Returns hover information for the token at the given position.
 */
export function getHover(
  content: string,
  line: number,
  character: number,
  index: WorkspaceIndex
): HoverResult | null {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";

  // Check if hovering over ${variable.path}
  const interpolationMatch = findInterpolationAtPosition(currentLine, character);
  if (interpolationMatch) {
    const allVars = index.getAllVariables();
    const rootVar = interpolationMatch.split(".")[0]!;
    const isKnown = allVars.includes(rootVar);
    return {
      contents: isKnown
        ? `**\`ctx.${interpolationMatch}\`**\n\nContext variable (defined in script block)`
        : `**\`ctx.${interpolationMatch}\`**\n\n⚠ Variable not found in any script block`,
    };
  }

  // Check if hovering over [bg src="..."]
  const assetMatch = findAssetSrcAtPosition(currentLine, character);
  if (assetMatch) {
    // Look up asset URL from all scenes' assets
    for (const sceneId of index.getSceneIds()) {
      const assets = index.getAssetsForScene(sceneId);
      if (assets[assetMatch]) {
        return {
          contents: `**Asset:** \`${assetMatch}\`\n\nURL: \`${assets[assetMatch]}\``,
        };
      }
    }
    return {
      contents: `**Asset:** \`${assetMatch}\`\n\nNo URL mapping found`,
    };
  }

  // Check if hovering over -> @scene/id
  const targetMatch = findSceneTargetAtPosition(currentLine, character);
  if (targetMatch) {
    const uri = index.getUriForSceneId(targetMatch);
    return {
      contents: uri
        ? `**Scene:** \`${targetMatch}\`\n\nDefined in: \`${uri}\``
        : `**Scene:** \`${targetMatch}\`\n\n⚠ Scene not found`,
    };
  }

  return null;
}

function findInterpolationAtPosition(line: string, char: number): string | null {
  const regex = /\$\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const start = match.index + 2; // after ${
    const end = match.index + match[0].length - 1; // before }
    if (char >= start && char <= end) {
      return match[1]!.trim();
    }
  }
  return null;
}

function findAssetSrcAtPosition(line: string, char: number): string | null {
  const regex = /\[bg\s+src="([^"]+)"\]/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (char >= start && char <= end) {
      return match[1]!;
    }
  }
  return null;
}

function findSceneTargetAtPosition(line: string, char: number): string | null {
  const regex = /->\s*@([\w\/_]+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (char >= start && char <= end) {
      return match[1]!;
    }
  }
  return null;
}
