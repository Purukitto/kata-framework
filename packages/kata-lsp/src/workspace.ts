import { parseKata, parseKataWithDiagnostics } from "@kata-framework/core";
import type { KSONScene, KSONAction, Diagnostic } from "@kata-framework/core";

export interface IndexedScene {
  uri: string;
  scene: KSONScene;
  diagnostics: Diagnostic[];
  variables: string[];
  assets: Record<string, string>;
}

/**
 * Maintains an index of all .kata files in the workspace.
 */
export class WorkspaceIndex {
  private scenes = new Map<string, IndexedScene>();
  private uriToSceneId = new Map<string, string>();

  updateFile(uri: string, content: string): IndexedScene {
    // Remove old entry for this URI
    const oldId = this.uriToSceneId.get(uri);
    if (oldId) {
      this.scenes.delete(oldId);
    }

    const { scene, diagnostics } = parseKataWithDiagnostics(content);
    const variables = extractVariables(scene.script);
    const assets = scene.meta.assets || {};

    const indexed: IndexedScene = { uri, scene, diagnostics, variables, assets };
    this.scenes.set(scene.meta.id, indexed);
    this.uriToSceneId.set(uri, scene.meta.id);

    return indexed;
  }

  removeFile(uri: string): void {
    const sceneId = this.uriToSceneId.get(uri);
    if (sceneId) {
      this.scenes.delete(sceneId);
      this.uriToSceneId.delete(uri);
    }
  }

  getSceneIds(): string[] {
    return [...this.scenes.keys()];
  }

  getSceneByUri(uri: string): IndexedScene | undefined {
    const sceneId = this.uriToSceneId.get(uri);
    if (!sceneId) return undefined;
    return this.scenes.get(sceneId);
  }

  getSceneById(sceneId: string): IndexedScene | undefined {
    return this.scenes.get(sceneId);
  }

  getUriForSceneId(sceneId: string): string | undefined {
    return this.scenes.get(sceneId)?.uri;
  }

  getVariablesForScene(sceneId: string): string[] {
    return this.scenes.get(sceneId)?.variables || [];
  }

  getAssetsForScene(sceneId: string): Record<string, string> {
    return this.scenes.get(sceneId)?.assets || {};
  }

  getAllVariables(): string[] {
    const vars = new Set<string>();
    for (const indexed of this.scenes.values()) {
      for (const v of indexed.variables) {
        vars.add(v);
      }
    }
    return [...vars];
  }

  getAllAssetKeys(): string[] {
    const keys = new Set<string>();
    for (const indexed of this.scenes.values()) {
      for (const k of Object.keys(indexed.assets)) {
        keys.add(k);
      }
    }
    return [...keys];
  }

  /**
   * Returns scene IDs that are defined in more than one file.
   */
  getDuplicateSceneIds(): Array<{ sceneId: string; uris: string[] }> {
    const idToUris = new Map<string, string[]>();
    for (const [uri, sceneId] of this.uriToSceneId) {
      const arr = idToUris.get(sceneId) || [];
      arr.push(uri);
      idToUris.set(sceneId, arr);
    }
    return [...idToUris.entries()]
      .filter(([, uris]) => uris.length > 1)
      .map(([sceneId, uris]) => ({ sceneId, uris }));
  }

  /**
   * Cross-file validation: checks for unresolved scene targets.
   */
  getUnresolvedTargets(sceneId: string): string[] {
    const indexed = this.scenes.get(sceneId);
    if (!indexed) return [];
    const targets = extractChoiceTargets(indexed.scene.actions);
    return targets.filter((t) => !this.scenes.has(t));
  }
}

/**
 * Extracts variable names from a script block.
 * Looks for patterns like `ctx.varName` assignments.
 */
function extractVariables(script: string): string[] {
  const vars = new Set<string>();
  const matches = script.matchAll(/ctx\.(\w+)/g);
  for (const match of matches) {
    if (match[1]) vars.add(match[1]);
  }
  return [...vars];
}

/**
 * Recursively extracts choice targets from actions.
 */
function extractChoiceTargets(actions: KSONAction[]): string[] {
  const targets: string[] = [];
  for (const action of actions) {
    if (action.type === "choice") {
      for (const choice of action.choices) {
        if (choice.target) targets.push(choice.target);
      }
    }
    if (action.type === "condition") {
      targets.push(...extractChoiceTargets(action.then));
      if (action.elseIf) {
        for (const branch of action.elseIf) {
          targets.push(...extractChoiceTargets(branch.then));
        }
      }
      if (action.else) {
        targets.push(...extractChoiceTargets(action.else));
      }
    }
  }
  return targets;
}
