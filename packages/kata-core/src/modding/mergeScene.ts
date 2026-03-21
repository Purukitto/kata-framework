import type { KSONScene, KSONAction } from "../types";

export interface ScenePatch {
  meta?: Record<string, unknown>;
  script?: string;
  actions?: ActionPatch[];
}

export type ActionPatch =
  | { op: "append"; actions: KSONAction[] }
  | { op: "replace"; index: number; action: KSONAction }
  | { op: "insertBefore"; index: number; actions: KSONAction[] }
  | { op: "insertAfter"; index: number; actions: KSONAction[] }
  | { op: "remove"; index: number };

export function mergeScene(base: KSONScene, patch: ScenePatch): KSONScene {
  const result = structuredClone(base);

  // Meta merge (RFC 7396)
  if (patch.meta) {
    for (const [key, value] of Object.entries(patch.meta)) {
      if (key === "id" && value === null) {
        throw new Error("Cannot remove 'id' from scene meta");
      }
      if (value === null) {
        delete (result.meta as unknown as Record<string, unknown>)[key];
      } else {
        (result.meta as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Script replacement
  if (patch.script !== undefined) {
    result.script = patch.script;
  }

  // Action patches applied sequentially
  if (patch.actions) {
    for (const ap of patch.actions) {
      switch (ap.op) {
        case "append":
          result.actions.push(...structuredClone(ap.actions));
          break;
        case "replace":
          result.actions[ap.index] = structuredClone(ap.action);
          break;
        case "insertBefore":
          result.actions.splice(ap.index, 0, ...structuredClone(ap.actions));
          break;
        case "insertAfter":
          result.actions.splice(ap.index + 1, 0, ...structuredClone(ap.actions));
          break;
        case "remove":
          result.actions.splice(ap.index, 1);
          break;
      }
    }
  }

  return result;
}
