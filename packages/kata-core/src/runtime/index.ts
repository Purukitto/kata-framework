import { EventEmitter } from "eventemitter3";
import { createGameStore, type GameState } from "./store";
import { evaluate, interpolate } from "./evaluator";
import { evaluateWithDiagnostic, interpolateWithDiagnostic } from "./evaluator";
import { SnapshotManager, type Migrator } from "./snapshot";
import { PluginManager, type KataPlugin } from "./plugin";
import type { AssetRegistry } from "../assets/index";
import type { KSONScene, KSONFrame, KSONAction, GameStateSnapshot, KataEngineOptions, UndoEntry } from "../types";

export class KataEngine extends EventEmitter {
  private store: ReturnType<typeof createGameStore>;
  private scenes: Map<string, KSONScene> = new Map();
  private snapshotManager: SnapshotManager;
  private assetRegistry: AssetRegistry | null = null;
  private pluginManager = new PluginManager();
  private undoStack: UndoEntry[] = [];
  private historyDepth: number;
  private hasStarted = false;

  constructor(initialCtx: Record<string, any> = {}, options: KataEngineOptions = {}) {
    super();
    this.store = createGameStore(initialCtx);
    this.snapshotManager = new SnapshotManager();
    this.historyDepth = options.historyDepth ?? 50;

    // Register built-in v1→v2 migrator
    this.snapshotManager.registerMigration(1, (data: any) => ({
      ...data,
      undoStack: [],
      schemaVersion: 2,
    }));
  }

  // Plugin API
  use(plugin: KataPlugin): void {
    this.pluginManager.register(plugin);
  }

  getPlugins(): string[] {
    return this.pluginManager.getNames();
  }

  removePlugin(name: string): void {
    this.pluginManager.remove(name);
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

    // Push undo entry only if engine already started (not initial start)
    if (this.hasStarted) {
      this.pushUndoEntry();
    }
    this.hasStarted = true;

    // Plugin: beforeSceneChange
    if (this.pluginManager.hasPlugins) {
      const state = this.store.getState();
      this.pluginManager.runBeforeSceneChange(state.currentSceneId, sceneId, state.ctx);
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

    // Push undo entry before state mutation
    this.pushUndoEntry();

    // Plugin: onChoice
    if (this.pluginManager.hasPlugins) {
      this.pluginManager.runOnChoice(choice, state.ctx);
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

    // Push undo entry before any state mutation
    this.pushUndoEntry();

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
      const { result: conditionResult, error } = evaluateWithDiagnostic(action.condition, state.ctx);

      if (error) {
        this.emit("error", {
          level: "error",
          message: `Condition evaluation failed: ${error}`,
          sceneId,
          actionIndex: currentIndex,
        });
        // Treat failed condition as false — skip to next action
      }

      if (conditionResult) {
        const thenActions = [...action.then];
        scene.actions.splice(currentIndex + 1, 0, ...thenActions);
      }
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

  back(): void {
    if (this.undoStack.length === 0) {
      return; // no-op
    }

    const entry = this.undoStack.pop()!;

    // Restore expanded actions if present
    if (entry.expandedActions && entry.currentSceneId) {
      const scene = this.scenes.get(entry.currentSceneId);
      if (scene) {
        scene.actions = entry.expandedActions;
      }
    }

    // Restore store state
    this.store.getState().restoreState({
      ctx: entry.ctx,
      currentSceneId: entry.currentSceneId,
      currentActionIndex: entry.currentActionIndex,
      history: entry.history,
    });

    // Re-emit frame if there's an active scene
    if (entry.currentSceneId) {
      this.emitFrame();
    }
  }

  getSnapshot(): GameStateSnapshot {
    const state = this.store.getState();
    const snapshot: GameStateSnapshot = {
      schemaVersion: 2,
      ctx: structuredClone(state.ctx),
      currentSceneId: state.currentSceneId,
      currentActionIndex: state.currentActionIndex,
      history: [...state.history],
      undoStack: structuredClone(this.undoStack),
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

    // Restore undo stack
    this.undoStack = snapshot.undoStack ?? [];

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

  private pushUndoEntry(): void {
    const state = this.store.getState();
    const entry: UndoEntry = {
      ctx: structuredClone(state.ctx),
      currentSceneId: state.currentSceneId,
      currentActionIndex: state.currentActionIndex,
      history: [...state.history],
    };

    // Deep-clone expanded actions if a scene is active
    if (state.currentSceneId) {
      const scene = this.scenes.get(state.currentSceneId);
      if (scene) {
        entry.expandedActions = structuredClone(scene.actions);
      }
    }

    this.undoStack.push(entry);

    // Cap at historyDepth
    if (this.undoStack.length > this.historyDepth) {
      this.undoStack.shift();
    }
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

    // Interpolate text content for text actions with diagnostics
    let processedAction: KSONAction = action;
    if (action.type === "text") {
      const { result, errors } = interpolateWithDiagnostic(action.content, state.ctx);
      processedAction = { ...action, content: result };
      for (const error of errors) {
        this.emit("error", {
          level: "error",
          message: error,
          sceneId,
          actionIndex: currentIndex,
        });
      }
    }

    // Plugin: beforeAction
    if (this.pluginManager.hasPlugins) {
      const transformed = this.pluginManager.runBeforeAction(processedAction, state.ctx);
      if (transformed === null) {
        return; // skip frame
      }
      processedAction = transformed;
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

    // Plugin: afterAction
    if (this.pluginManager.hasPlugins) {
      this.pluginManager.runAfterAction(processedAction, state.ctx);
    }
  }
}
