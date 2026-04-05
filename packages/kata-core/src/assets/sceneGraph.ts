import type { KSONScene, KSONAction } from "../types";
import type { AssetRegistry } from "./index";

/**
 * Recursively extracts choice targets from an array of actions,
 * including targets nested inside condition branches.
 */
function extractTargets(actions: KSONAction[], targets: Set<string>): void {
  for (const action of actions) {
    if (action.type === "choice") {
      for (const choice of action.choices) {
        if (choice.target) {
          targets.add(choice.target);
        }
      }
    }
    if (action.type === "condition") {
      extractTargets(action.then, targets);
      if (action.elseIf) {
        for (const branch of action.elseIf) {
          extractTargets(branch.then, targets);
        }
      }
      if (action.else) {
        extractTargets(action.else, targets);
      }
    }
  }
}

export class SceneGraph {
  private edges = new Map<string, Set<string>>();
  private allSceneIds = new Set<string>();

  buildFromScenes(scenes: KSONScene[]): void {
    this.edges.clear();
    this.allSceneIds.clear();

    for (const scene of scenes) {
      this.allSceneIds.add(scene.meta.id);
      const targets = new Set<string>();
      extractTargets(scene.actions, targets);
      this.edges.set(scene.meta.id, targets);
    }
  }

  getReachable(sceneId: string, depth: number = 1): string[] {
    if (depth <= 0) return [sceneId];

    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: sceneId, d: 0 }];
    visited.add(sceneId);

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;

      const neighbors = this.edges.get(id);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, d: d + 1 });
        }
      }
    }

    return [...visited];
  }

  getPreloadSet(
    sceneId: string,
    registry: AssetRegistry,
    depth: number = 1
  ): string[] {
    const reachable = this.getReachable(sceneId, depth);
    return registry.getAssetsForScenes(reachable);
  }

  /**
   * Returns scene IDs that are not reachable from startId.
   */
  getOrphans(startId: string): string[] {
    const reachable = new Set(this.getReachable(startId, Infinity));
    return [...this.allSceneIds].filter((id) => !reachable.has(id));
  }

  /**
   * Returns scene IDs that have no outbound edges.
   */
  getDeadEnds(): string[] {
    return [...this.allSceneIds].filter((id) => {
      const targets = this.edges.get(id);
      return !targets || targets.size === 0;
    });
  }

  /**
   * Returns a JSON-serializable representation of the graph.
   */
  toJSON(): { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> } {
    const nodes = [...this.allSceneIds].map((id) => ({ id }));
    const edges: Array<{ from: string; to: string }> = [];

    for (const [from, targets] of this.edges) {
      for (const to of targets) {
        edges.push({ from, to });
      }
    }

    return { nodes, edges };
  }

  /**
   * Returns a Graphviz DOT format string representing the graph.
   */
  toDOT(): string {
    const lines: string[] = ["digraph {"];

    for (const id of this.allSceneIds) {
      lines.push(`  "${id}";`);
    }

    for (const [from, targets] of this.edges) {
      for (const to of targets) {
        lines.push(`  "${from}" -> "${to}";`);
      }
    }

    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Returns all scene IDs known to the graph.
   */
  getAllSceneIds(): string[] {
    return [...this.allSceneIds];
  }
}
