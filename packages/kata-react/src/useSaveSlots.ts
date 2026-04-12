import { useState, useCallback } from "react";
import type { KataEngine } from "@kata-framework/core";
import { useKataEngine } from "./context";
import type { SaveManager, SaveSlot } from "./SaveManager";

/**
 * React hook for managing save slots.
 * Provides reactive slot data and save/load/remove actions.
 *
 * @param saveManager - The SaveManager instance
 * @param engine - Optional engine override (falls back to KataProvider context)
 */
export function useSaveSlots(saveManager: SaveManager, engine?: KataEngine) {
  // Try context if no engine passed
  let resolvedEngine: KataEngine;
  try {
    resolvedEngine = engine ?? useKataEngine();
  } catch {
    // If no context and no engine, we'll throw on save/load
    resolvedEngine = undefined as any;
  }

  const [slots, setSlots] = useState<SaveSlot[]>(() => saveManager.getSlots());

  const refresh = useCallback(() => {
    setSlots(saveManager.getSlots());
  }, [saveManager]);

  const save = useCallback(
    (index: number) => {
      if (!resolvedEngine) {
        throw new Error(
          "useSaveSlots: no engine available. Provide one via props or use within KataProvider."
        );
      }
      const snapshot = resolvedEngine.getSnapshot();
      saveManager.save(index, snapshot);
      refresh();
    },
    [saveManager, resolvedEngine, refresh]
  );

  const load = useCallback(
    (index: number) => {
      if (!resolvedEngine) {
        throw new Error(
          "useSaveSlots: no engine available. Provide one via props or use within KataProvider."
        );
      }
      const snapshot = saveManager.load(index);
      if (snapshot) {
        resolvedEngine.loadSnapshot(snapshot);
      }
      refresh();
    },
    [saveManager, resolvedEngine, refresh]
  );

  const remove = useCallback(
    (index: number) => {
      saveManager.remove(index);
      refresh();
    },
    [saveManager, refresh]
  );

  return { slots, save, load, remove, refresh };
}
