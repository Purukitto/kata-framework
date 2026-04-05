import { EventEmitter } from "eventemitter3";
import { createGameStore, type GameState } from "./store";
import { evaluate, interpolate } from "./evaluator";
import { evaluateWithDiagnostic, interpolateWithDiagnostic } from "./evaluator";
import { SnapshotManager, type Migrator } from "./snapshot";
import { PluginManager } from "./plugin";
import type { KataPlugin } from "./plugin";
import { validatePlugin } from "../plugins/validate";
import type { AssetRegistry } from "../assets/index";
import { generateA11yHints } from "../a11y/index";
import { LocaleManager } from "../i18n/index";
import type { KSONScene, KSONFrame, KSONAction, GameStateSnapshot, KataEngineOptions, UndoEntry, LocaleOverride } from "../types";

export class KataEngine extends EventEmitter {
  private store: ReturnType<typeof createGameStore>;
  private scenes: Map<string, KSONScene> = new Map();
  private snapshotManager: SnapshotManager;
  private assetRegistry: AssetRegistry | null = null;
  private pluginManager = new PluginManager();
  private undoStack: UndoEntry[] = [];
  private historyDepth: number;
  private hasStarted = false;
  private localeManager = new LocaleManager();

  constructor(initialCtx: Record<string, any> = {}, options: KataEngineOptions = {}) {
    super();
    this.store = createGameStore(initialCtx);
    this.snapshotManager = new SnapshotManager();
    this.historyDepth = options.historyDepth ?? 50;

    if (options.locale) this.localeManager.setLocale(options.locale);
    if (options.localeFallback) this.localeManager.setFallback(options.localeFallback);

    // Register built-in v1→v2 migrator
    this.snapshotManager.registerMigration(1, (data: any) => ({
      ...data,
      undoStack: [],
      schemaVersion: 2,
    }));

    // Register built-in v2→v3 migrator (adds locale fields)
    this.snapshotManager.registerMigration(2, (data: any) => ({
      ...data,
      schemaVersion: 3,
    }));
  }

  // Locale API
  setLocale(locale: string): void {
    this.localeManager.setLocale(locale);
  }

  setLocaleFallback(fallback: string): void {
    this.localeManager.setFallback(fallback);
  }

  registerLocale(sceneId: string, locale: string, overrides: LocaleOverride[]): void {
    this.localeManager.registerLocale(sceneId, locale, overrides);
  }

  // Plugin API
  use(plugin: KataPlugin): void {
    const result = validatePlugin(plugin);
    if (!result.valid) {
      throw new Error(`Invalid plugin: ${result.errors.join("; ")}`);
    }
    this.pluginManager.register(plugin);
    plugin.init?.(this);
  }

  getPlugins(): string[] {
    return this.pluginManager.getNames();
  }

  removePlugin(name: string): void {
    this.pluginManager.remove(name);
  }

  getPlugin<T extends KataPlugin = KataPlugin>(name: string): T | undefined {
    return this.pluginManager.getPlugin(name) as T | undefined;
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
        if (this.pluginManager.hasPlugins) this.pluginManager.runOnEnd(sceneId);
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
      } else {
        // Try elseIf branches
        let matched = false;
        if (action.elseIf) {
          for (const branch of action.elseIf) {
            const { result: branchResult, error: branchError } = evaluateWithDiagnostic(branch.condition, state.ctx);
            if (branchError) {
              this.emit("error", {
                level: "error",
                message: `Condition evaluation failed: ${branchError}`,
                sceneId,
                actionIndex: currentIndex,
              });
            }
            if (branchResult) {
              scene.actions.splice(currentIndex + 1, 0, ...branch.then);
              matched = true;
              break;
            }
          }
        }
        // Fall through to else branch
        if (!matched && action.else) {
          scene.actions.splice(currentIndex + 1, 0, ...action.else);
        }
      }
    }

    const totalActions = scene.actions.length;

    // Check if we're at the end
    if (currentIndex >= totalActions - 1) {
      if (this.pluginManager.hasPlugins) this.pluginManager.runOnEnd(sceneId);
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
    const locale = this.localeManager.getLocale();
    const localeFallback = this.localeManager.getFallback();
    const snapshot: GameStateSnapshot = {
      schemaVersion: 3,
      ctx: structuredClone(state.ctx),
      currentSceneId: state.currentSceneId,
      currentActionIndex: state.currentActionIndex,
      history: [...state.history],
      undoStack: structuredClone(this.undoStack),
      ...(locale ? { locale } : {}),
      ...(localeFallback ? { localeFallback } : {}),
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

    // Restore locale settings
    if (snapshot.locale !== undefined) this.localeManager.setLocale(snapshot.locale);
    if (snapshot.localeFallback !== undefined) this.localeManager.setFallback(snapshot.localeFallback);

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
        if (this.pluginManager.hasPlugins) this.pluginManager.runOnEnd(sceneId);
        this.emit("end", { sceneId });
        return;
      }
      this.store.getState().nextAction();
      this.emitFrame();
      return;
    }

    // Tween actions are fire-and-forget: emit frame then auto-advance
    if (action.type === "tween" || action.type === "tween-group") {
      // Build and emit the tween frame so UI receives tween data
      let processedAction: KSONAction = action;

      if (this.pluginManager.hasPlugins) {
        const transformed = this.pluginManager.runBeforeAction(processedAction, state.ctx);
        if (transformed === null) {
          return;
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
        a11y: generateA11yHints(processedAction),
      };
      this.emit("update", frame);

      if (this.pluginManager.hasPlugins) {
        this.pluginManager.runAfterAction(processedAction, state.ctx);
      }

      // Auto-advance to next action
      const totalActions = scene.actions.length;
      if (currentIndex >= totalActions - 1) {
        if (this.pluginManager.hasPlugins) this.pluginManager.runOnEnd(sceneId);
        this.emit("end", { sceneId });
        return;
      }
      this.store.getState().nextAction();
      this.emitFrame();
      return;
    }

    // Apply locale overrides before interpolation
    let processedAction: KSONAction = this.localeManager.resolveText(sceneId, currentIndex, action);

    // Interpolate text content for text actions with diagnostics
    if (processedAction.type === "text") {
      const { result, errors } = interpolateWithDiagnostic(processedAction.content, state.ctx);
      processedAction = { ...processedAction, content: result };
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
      a11y: generateA11yHints(processedAction),
    };

    this.emit("update", frame);

    // Plugin: afterAction
    if (this.pluginManager.hasPlugins) {
      this.pluginManager.runAfterAction(processedAction, state.ctx);
    }
  }
}
