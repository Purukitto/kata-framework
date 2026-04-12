# @kata-framework/react

## 1.2.0

### Minor Changes

- feat: Runtime resilience & error recovery (Phase 8)

  **@kata-framework/core:**

  - Graceful scene target resolution: `onMissingScene` option with `"throw"` (default), `"error-event"`, and `"fallback"` strategies
  - Expression evaluation sandbox hardening: blocked globals, loop guard instrumentation, null-prototype exec context
  - New `evalTimeout` engine option for configurable loop iteration limits

  **@kata-framework/react:**

  - `KataErrorBoundary` component with `reset()`, `restart()`, and `loadLastSave()` recovery actions
  - Integrates with `SaveManager` for save-based error recovery

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.8.0
  - @kata-framework/sync@0.2.2

## 1.1.0

### Minor Changes

- feat: Production React layer — TypewriterText, SceneTransition, TweenTarget/useTween, SaveManager/useSaveSlots

  - TypewriterText: character-by-character text reveal with rAF, skip-on-click, reduced-motion, aria-label/aria-live a11y
  - SceneTransition: CSS transitions (fade, slide-left, dissolve, none) with dual-container crossfade, rapid-change handling
  - TweenTarget/useTween: context-based tween style distribution mapping KSON tween properties to CSS transforms
  - SaveManager: storage-agnostic save slot manager with StorageAdapter interface and localStorage built-in
  - useSaveSlots: reactive React hook for save/load/remove with engine integration
  - TweenProvider auto-included in KataProvider
  - 42 new tests

## 1.0.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.7.0
  - @kata-framework/sync@0.2.1

## 1.0.0

### Minor Changes

- feat: Phase 5 — Multiplayer (v0.6.0)

  New `@kata-framework/sync` package with host-authoritative multiplayer:

  - Sync protocol with `SyncEvent` types and `KataSyncTransport` interface
  - `KataSyncManager` wraps `KataEngine` for authority/follower routing
  - `BroadcastChannelTransport` for same-device multiplayer (browser tabs)
  - `WebSocketTransport` + `KataServer` for networked rooms
  - Choice policies: first-writer, designated player, vote with timeout
  - Player presence: join/leave events, roster, spectator mode
  - `StatePartition` for shared vs branching modes with sync point barriers
  - Authority migration: oldest non-spectator peer inherits on disconnect

  `@kata-framework/core`: Added optional `multiplayer` field to `KSONMeta` and `MultiplayerMeta` type.

  `@kata-framework/react`: Added `useKataMultiplayer()` hook and `KataMultiplayerProvider` context.

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.6.0
  - @kata-framework/sync@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.5.0

## 0.2.0

### Minor Changes

- feat: Phase 3 — Reach & Intelligence (v0.4.0)

  - Localization (i18n): LocaleManager with per-scene overrides, fallback chain, snapshot v3 migration
  - Analytics plugin: scene visits, choice tracking, drop-off detection, actions-per-scene, export/reset
  - Accessibility: a11y hints on every KSONFrame (role, label, liveRegion, keyHints, reducedMotion)
  - Animation/tween timelines: tween and tween-group action types, parser directives, fire-and-forget runtime
  - React a11y hooks: useReducedMotion, useKeyboardNavigation, useFocusManagement
  - ARIA attributes on KataDebug component

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.2.0

## 0.1.0

### Minor Changes

- 8f169c5: Add audio manager, layered VFS, scene merging, asset preloading, scene graph, snapshot system. Fix React imports to use @kata-framework/core with useSyncExternalStore.

### Patch Changes

- Updated dependencies [8f169c5]
  - @kata-framework/core@0.1.0
