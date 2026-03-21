import { useSyncExternalStore, useCallback, useRef } from "react";
import { useKataEngine } from "./context";
import type { KSONFrame, GameStateSnapshot } from "@kata-framework/core";

interface KataState {
  frame: KSONFrame | null;
  ended: boolean;
}

export function useKata() {
  const engine = useKataEngine();
  const stateRef = useRef<KataState>({ frame: null, ended: false });
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleUpdate = (frame: KSONFrame) => {
        stateRef.current = { frame, ended: false };
        versionRef.current++;
        onStoreChange();
      };

      const handleEnd = () => {
        stateRef.current = { ...stateRef.current, ended: true };
        versionRef.current++;
        onStoreChange();
      };

      engine.on("update", handleUpdate);
      engine.on("end", handleEnd);

      return () => {
        engine.off("update", handleUpdate);
        engine.off("end", handleEnd);
      };
    },
    [engine]
  );

  const getSnapshotFn = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshotFn, getSnapshotFn);

  const start = useCallback((id: string) => engine.start(id), [engine]);
  const next = useCallback(() => engine.next(), [engine]);
  const makeChoice = useCallback((id: string) => engine.makeChoice(id), [engine]);
  const getSnapshot = useCallback((): GameStateSnapshot => engine.getSnapshot(), [engine]);
  const loadSnapshot = useCallback((raw: unknown) => engine.loadSnapshot(raw), [engine]);

  return {
    frame: state.frame,
    state: state.frame?.state ?? null,
    actions: {
      start,
      next,
      makeChoice,
      getSnapshot,
      loadSnapshot,
    },
  };
}
