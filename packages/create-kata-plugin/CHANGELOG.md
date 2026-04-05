# create-kata-plugin

## 0.2.0

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
