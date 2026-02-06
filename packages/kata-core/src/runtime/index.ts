import { EventEmitter } from "eventemitter3";
import { createGameStore, type GameState } from "./store";
import type { KSONScene, KSONFrame } from "../types";

export class KataEngine extends EventEmitter {
  private store: ReturnType<typeof createGameStore>;
  private scenes: Map<string, KSONScene> = new Map();

  constructor(initialCtx: Record<string, any> = {}) {
    super();
    this.store = createGameStore(initialCtx);
  }

  registerScene(scene: KSONScene): void {
    this.scenes.set(scene.meta.id, scene);
  }

  start(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" not found`);
    }

    // Reset state to the scene via store action
    this.store.getState().setScene(sceneId);

    // Emit the first frame
    this.emitFrame();
  }

  next(): void {
    const state = this.store.getState();
    const sceneId = state.currentSceneId;
    
    if (!sceneId) {
      throw new Error("No active scene. Call start() first.");
    }

    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" not found`);
    }

    const currentIndex = state.currentActionIndex;
    const totalActions = scene.actions.length;

    // Check if we're at the end
    if (currentIndex >= totalActions - 1) {
      this.emit("end", { sceneId });
      return;
    }

    // Increment action index via store action
    state.nextAction();

    // Emit update event
    this.emitFrame();
  }

  private emitFrame(): void {
    const state = this.store.getState();
    const sceneId = state.currentSceneId;
    
    if (!sceneId) {
      return;
    }

    const scene = this.scenes.get(sceneId);
    if (!scene) {
      return;
    }

    const currentIndex = state.currentActionIndex;
    const action = scene.actions[currentIndex];

    if (!action) {
      return;
    }

    const frame: KSONFrame = {
      meta: scene.meta,
      action,
      state: {
        ctx: state.ctx,
        currentSceneId: state.currentSceneId,
        currentActionIndex: state.currentActionIndex,
        history: state.history,
      },
    };

    this.emit("update", frame);
  }
}
