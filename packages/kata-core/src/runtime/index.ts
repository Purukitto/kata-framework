import { EventEmitter } from "eventemitter3";
import { createGameStore, type GameState } from "./store";
import { evaluate, interpolate } from "./evaluator";
import type { KSONScene, KSONFrame, KSONAction } from "../types";

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

  makeChoice(choiceId: string): void {
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
    const action = scene.actions[currentIndex];

    if (!action || action.type !== "choice") {
      throw new Error("Current action is not a choice.");
    }

    const choice = action.choices.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`Choice "${choiceId}" not found`);
    }

    if (choice.target) {
      this.start(choice.target);
      return;
    }

    // No target: advance to next action
    this.next();
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
    const action = scene.actions[currentIndex];

    // Handle condition actions
    if (action && action.type === "condition") {
      const conditionResult = evaluate(action.condition, state.ctx);
      
      if (conditionResult) {
        // True: Insert the then actions into the playback queue immediately after the current index
        const thenActions = [...action.then]; // Create a copy to avoid mutation issues
        scene.actions.splice(currentIndex + 1, 0, ...thenActions);
      }
      // False: Skip to the next action (fall through to increment)
    }

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

    // Interpolate text content for text actions
    let processedAction: KSONAction = action;
    if (action.type === "text") {
      processedAction = {
        ...action,
        content: interpolate(action.content, state.ctx),
      };
    }

    const frame: KSONFrame = {
      meta: scene.meta,
      action: processedAction,
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
