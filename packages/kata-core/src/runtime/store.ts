import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";

export interface GameState {
  ctx: Record<string, any>;
  currentSceneId: string | null;
  currentActionIndex: number;
  history: string[];
}

export interface GameStore extends GameState {
  setVariable: (key: string, value: any) => void;
  setScene: (sceneId: string) => void;
  nextAction: () => void;
  restoreState: (snapshot: {
    ctx: Record<string, any>;
    currentSceneId: string | null;
    currentActionIndex: number;
    history: string[];
  }) => void;
}

export function createGameStore(initialCtx: Record<string, any> = {}) {
  return createStore<GameStore>()(
    immer((set) => ({
      ctx: initialCtx,
      currentSceneId: null,
      currentActionIndex: 0,
      history: [],

      setVariable: (key: string, value: any) =>
        set((state) => {
          state.ctx[key] = value;
        }),

      setScene: (sceneId: string) =>
        set((state) => {
          state.currentSceneId = sceneId;
          state.currentActionIndex = 0;
          if (sceneId && !state.history.includes(sceneId)) {
            state.history.push(sceneId);
          }
        }),

      nextAction: () =>
        set((state) => {
          state.currentActionIndex += 1;
        }),

      restoreState: (snapshot) =>
        set((state) => {
          state.ctx = snapshot.ctx;
          state.currentSceneId = snapshot.currentSceneId;
          state.currentActionIndex = snapshot.currentActionIndex;
          state.history = snapshot.history;
        }),
    }))
  );
}
