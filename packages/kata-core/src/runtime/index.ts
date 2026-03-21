import { EventEmitter } from "eventemitter3";
import { createGameStore, type GameState } from "./store";
import { evaluate, interpolate } from "./evaluator";
import { SnapshotManager, type Migrator } from "./snapshot";
import type { AssetRegistry } from "../assets/index";
import type { KSONScene, KSONFrame, KSONAction, GameStateSnapshot } from "../types";

export class KataEngine extends EventEmitter {
  private store: ReturnType<typeof createGameStore>;
  private scenes: Map<string, KSONScene> = new Map();
  private snapshotManager: SnapshotManager;
  private assetRegistry: AssetRegistry | null = null;

  constructor(initialCtx: Record<string, any> = {}) {
    super();
    this.store = createGameStore(initialCtx);
    this.snapshotManager = new SnapshotManager();
  }

  registerScene(scene: KSONScene): void {
    this.scenes.set(scene.meta.id, scene);
  }

  setAssetRegistry(registry: AssetRegistry): void {
    this.assetRegistry = registry;
  }

  start(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" not found`);
    }

    // Reset state to the scene via store action
    this.store.getState().setScene(sceneId);

    // Emit preload signal if asset registry is configured
    if (this.assetRegistry) {
      this.emit("preload", this.assetRegistry.getAssetsForScene(sceneId));
    }

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

    // Handle audio actions (fire-and-forget, auto-advance)
    if (action && action.type === "audio") {
      this.emit("audio", action.command);
      const totalActions = scene.actions.length;
      if (currentIndex >= totalActions - 1) {
        this.emit("end", { sceneId });
        return;
      }
      state.nextAction();
      this.emitFrame();
      return;
    }

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

  getSnapshot(): GameStateSnapshot {
    const state = this.store.getState();
    const snapshot: GameStateSnapshot = {
      schemaVersion: 1,
      ctx: structuredClone(state.ctx),
      currentSceneId: state.currentSceneId,
      currentActionIndex: state.currentActionIndex,
      history: [...state.history],
    };

    // Include expanded actions if a scene is active (handles condition splicing)
    if (state.currentSceneId) {
      const scene = this.scenes.get(state.currentSceneId);
      if (scene) {
        snapshot.expandedActions = structuredClone(scene.actions);
      }
    }

    return snapshot;
  }

  loadSnapshot(raw: unknown): void {
    const snapshot = this.snapshotManager.migrate(raw);

    // Validate sceneId exists if non-null
    if (snapshot.currentSceneId !== null && !this.scenes.has(snapshot.currentSceneId)) {
      throw new Error(`Scene "${snapshot.currentSceneId}" not found. Register scenes before loading a snapshot.`);
    }

    // Restore expanded actions if present
    if (snapshot.expandedActions && snapshot.currentSceneId) {
      const scene = this.scenes.get(snapshot.currentSceneId);
      if (scene) {
        scene.actions = snapshot.expandedActions;
      }
    }

    // Restore store state
    this.store.getState().restoreState({
      ctx: snapshot.ctx,
      currentSceneId: snapshot.currentSceneId,
      currentActionIndex: snapshot.currentActionIndex,
      history: snapshot.history,
    });

    // Emit current frame if there's an active scene
    if (snapshot.currentSceneId) {
      this.emitFrame();
    }
  }

  registerMigration(fromVersion: number, migrator: Migrator): void {
    this.snapshotManager.registerMigration(fromVersion, migrator);
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

    // Audio actions are fire-and-forget: emit audio event and auto-advance
    if (action.type === "audio") {
      this.emit("audio", action.command);
      const totalActions = scene.actions.length;
      if (currentIndex >= totalActions - 1) {
        this.emit("end", { sceneId });
        return;
      }
      this.store.getState().nextAction();
      this.emitFrame();
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
