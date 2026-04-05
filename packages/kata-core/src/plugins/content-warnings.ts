import type { KataPlugin } from "../runtime/plugin";

export interface ContentWarningsConfig {
  warnings: Record<string, string[]>;
  onWarn: (sceneId: string, tags: string[]) => void;
}

export interface ContentWarningsPlugin extends KataPlugin {
  getWarnings(sceneId: string): string[];
  addWarning(sceneId: string, tags: string[]): void;
  removeWarning(sceneId: string, tags: string[]): void;
  getAllWarnings(): Record<string, string[]>;
}

export function contentWarningsPlugin(config: ContentWarningsConfig): ContentWarningsPlugin {
  const warnings: Map<string, Set<string>> = new Map();

  // Initialize from config
  for (const [sceneId, tags] of Object.entries(config.warnings)) {
    warnings.set(sceneId, new Set(tags));
  }

  return {
    name: "content-warnings",

    beforeSceneChange(_fromId: string | null, toId: string, _ctx: Record<string, any>): void {
      const tags = warnings.get(toId);
      if (tags && tags.size > 0) {
        config.onWarn(toId, [...tags]);
      }
    },

    getWarnings(sceneId: string): string[] {
      const tags = warnings.get(sceneId);
      return tags ? [...tags] : [];
    },

    addWarning(sceneId: string, tags: string[]): void {
      if (!warnings.has(sceneId)) {
        warnings.set(sceneId, new Set());
      }
      const set = warnings.get(sceneId)!;
      for (const tag of tags) {
        set.add(tag);
      }
    },

    removeWarning(sceneId: string, tags: string[]): void {
      const set = warnings.get(sceneId);
      if (!set) return;
      for (const tag of tags) {
        set.delete(tag);
      }
      if (set.size === 0) {
        warnings.delete(sceneId);
      }
    },

    getAllWarnings(): Record<string, string[]> {
      const result: Record<string, string[]> = {};
      for (const [sceneId, tags] of warnings) {
        result[sceneId] = [...tags];
      }
      return result;
    },
  };
}
