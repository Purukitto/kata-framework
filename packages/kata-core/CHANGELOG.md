# @kata-framework/core

## 0.5.0

### Minor Changes

- Phase 4: Plugin Ecosystem (v0.5.0)

  - **Subpath exports** — each official plugin is importable via `@kata-framework/core/plugins/*` for tree-shaking
  - **Profanity filter plugin** — censor text/choice labels with configurable word lists, replacement strategies, and scoping
  - **Auto-save plugin** — automatic snapshots on scene changes, choices, every action, or timed intervals with slot rotation
  - **Debug logger plugin** — structured lifecycle logging with quiet/normal/verbose levels and custom output sinks
  - **Content warnings plugin** — tag scenes with warning labels and fire callbacks before entering tagged scenes
  - **Plugin validation utility** — runtime validation for plugin objects, integrated into `engine.use()`
  - **`init` hook** — new optional lifecycle hook called once on plugin registration
  - **`create-kata-plugin` scaffolder** — `bun create kata-plugin <name>` bootstraps a new plugin project
  - **Plugin authoring guide** — comprehensive guide at `docs/plugins.md`
  - **Plugin catalog** — official + community listing at `docs/plugins-catalog.md`
  - **BREAKING:** `analyticsPlugin` removed from main entry — use `@kata-framework/core/plugins/analytics`
  - **BREAKING:** `engine.use()` now validates plugins and throws on invalid objects

## 0.4.0

### Minor Changes

- feat: Phase 3 — Reach & Intelligence (v0.4.0)

  - Localization (i18n): LocaleManager with per-scene overrides, fallback chain, snapshot v3 migration
  - Analytics plugin: scene visits, choice tracking, drop-off detection, actions-per-scene, export/reset
  - Accessibility: a11y hints on every KSONFrame (role, label, liveRegion, keyHints, reducedMotion)
  - Animation/tween timelines: tween and tween-group action types, parser directives, fire-and-forget runtime
  - React a11y hooks: useReducedMotion, useKeyboardNavigation, useFocusManagement
  - ARIA attributes on KataDebug component

## 0.3.0

### Minor Changes

- feat: Phase 2 syntax extensions and scene graph analysis

  - New `.kata` syntax: `[wait N]`, `[exec]...[/exec]`, `:::elseif`/`:::else` branches, `// comments`
  - Extended `KSONAction` condition type with `elseIf` and `else` fields
  - Runtime evaluates elseif/else branches in order with proper fallback
  - `SceneGraph` gains `getOrphans()`, `getDeadEnds()`, `toJSON()`, `toDOT()` methods
  - Diagnostics: missing wait duration, unclosed exec blocks, orphaned else/elseif

## 0.2.0

### Minor Changes

- Phase 1 — Engine Extensibility (v0.2.0)

  - Plugin system: `engine.use()`, `getPlugins()`, `removePlugin()` with lifecycle hooks (`beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange`)
  - Undo/rewind: `engine.back()` restores previous state; configurable `historyDepth` (default 50); undo stack included in snapshots
  - Error diagnostics: `parseKataWithDiagnostics()` for static analysis; engine emits `"error"` events for failed conditions/interpolations instead of crashing
  - New evaluator functions: `evaluateWithDiagnostic()`, `interpolateWithDiagnostic()` for structured error returns
  - Snapshot schema version bumped to 2 with built-in v1→v2 migrator
  - New package `@kata-framework/test-utils` with `createTestEngine()`, `collectFrames()`, `assertFrame()`, `mockAudioManager()`

## 0.1.0

### Minor Changes

- 8f169c5: Add audio manager, layered VFS, scene merging, asset preloading, scene graph, snapshot system. Fix React imports to use @kata-framework/core with useSyncExternalStore.
