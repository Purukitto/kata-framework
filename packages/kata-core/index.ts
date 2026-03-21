// Parser
export { parseKata } from "./src/parser/index";
export { parseKataWithDiagnostics } from "./src/parser/diagnostics";

// Runtime
export { KataEngine } from "./src/runtime/index";
export { createGameStore } from "./src/runtime/store";
export { evaluate, interpolate } from "./src/runtime/evaluator";
export { evaluateWithDiagnostic, interpolateWithDiagnostic } from "./src/runtime/evaluator";

// Plugin
export type { KataPlugin } from "./src/runtime/plugin";

// Snapshot
export { SnapshotManager, CURRENT_SCHEMA_VERSION } from "./src/runtime/snapshot";
export type { Migrator } from "./src/runtime/snapshot";

// Audio
export { NoopAudioManager } from "./src/audio/index";
export type { AudioManager } from "./src/audio/index";

// VFS
export { LayeredVFS } from "./src/vfs/index";
export type { VFSProvider } from "./src/vfs/index";

// Modding
export { mergeScene } from "./src/modding/mergeScene";
export type { ScenePatch, ActionPatch } from "./src/modding/mergeScene";

// Assets
export { AssetRegistry } from "./src/assets/index";
export type { AssetLoader } from "./src/assets/index";
export { SceneGraph } from "./src/assets/sceneGraph";

// Types
export type {
  KSONScene,
  KSONAction,
  KSONFrame,
  KSONMeta,
  Choice,
  AudioCommand,
  GameStateSnapshot,
  Diagnostic,
  KataEngineOptions,
  UndoEntry,
} from "./src/types";
export type { GameState, GameStore } from "./src/runtime/store";
