# @kata-framework/test-utils

## 0.2.0

### Minor Changes

- Phase 1 — Engine Extensibility (v0.2.0)

  - Plugin system: `engine.use()`, `getPlugins()`, `removePlugin()` with lifecycle hooks (`beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange`)
  - Undo/rewind: `engine.back()` restores previous state; configurable `historyDepth` (default 50); undo stack included in snapshots
  - Error diagnostics: `parseKataWithDiagnostics()` for static analysis; engine emits `"error"` events for failed conditions/interpolations instead of crashing
  - New evaluator functions: `evaluateWithDiagnostic()`, `interpolateWithDiagnostic()` for structured error returns
  - Snapshot schema version bumped to 2 with built-in v1→v2 migrator
  - New package `@kata-framework/test-utils` with `createTestEngine()`, `collectFrames()`, `assertFrame()`, `mockAudioManager()`

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.2.0
