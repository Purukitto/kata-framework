import type { KSONScene } from "../types";
import type { AssetRegistry } from "./index";

export class SceneGraph {
  private edges = new Map<string, Set<string>>();

  buildFromScenes(scenes: KSONScene[]): void {
    this.edges.clear();

    for (const scene of scenes) {
      const targets = new Set<string>();

      for (const action of scene.actions) {
        if (action.type === "choice") {
          for (const choice of action.choices) {
            if (choice.target) {
              targets.add(choice.target);
            }
          }
        }
        if (action.type === "condition") {
          for (const thenAction of action.then) {
            if (thenAction.type === "choice") {
              for (const choice of thenAction.choices) {
                if (choice.target) {
                  targets.add(choice.target);
                }
              }
            }
          }
        }
      }

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

  getPreloadSet(sceneId: string, registry: AssetRegistry, depth: number = 1): string[] {
    const reachable = this.getReachable(sceneId, depth);
    return registry.getAssetsForScenes(reachable);
  }
}
