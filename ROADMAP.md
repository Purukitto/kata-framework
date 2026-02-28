# Kata Framework — Technical Roadmap (3 Months)

Target: complex narrative games (Free Cities, Masters of Raana–style): deep branching, mods, heavy media, and long playthroughs. This roadmap fills gaps in **persistence**, **modding**, **assets**, **tooling**, and **audio** while staying headless and KSON-first.

---

## 1. Persistence (Save / Load)

### [ ] 1.1 Serializing the store (Zustand)

**Proposal:** Add a `getSnapshot(): GameStateSnapshot` on the engine that reads `store.getState()` and returns a plain serializable object `{ version, ctx, currentSceneId, currentActionIndex, history }` (no getters/functions), plus `engine.load(snapshot)` that creates a new store via `createGameStore(snapshot.ctx)` and restores scene/index/history via existing store actions so the engine stays the single source of truth.

### [ ] 1.2 Version migrations (v1.0 save on v1.1)

**Proposal:** Store a `version: number` (or `schemaVersion: string`) in every save blob; at load time run a pipeline of pure migrator functions `migrateV1ToV2(save) => save` registered by version; the engine only ever receives the latest shape, so adding new variables or fields in v1.1 is handled by migrators that default missing keys and drop obsolete ones.

---

## 2. Modding System (The VFS)

### [ ] 2.1 Layered Virtual File System

**Proposal:** Introduce a small `VFS` interface in kata-core (`readFile(path)`, `listDir(path)`, `getLayers(): string[]`) and a `LayeredVFS` implementation that composes multiple providers (e.g. base game, mod A, mod B) with a defined layer order; `readFile(path)` returns the first non-missing result from the highest-priority layer, so mods override base files by path without mutating the base package.

### [ ] 2.2 Merging JSON patches over existing scenes

**Proposal:** Implement a `mergeScene(base: KSONScene, patch: Partial<KSONScene> | KSONScenePatch)` that uses RFC 7396 JSON Merge Patch for `meta` and a KSON-aware merge for `actions` (e.g. patch actions by stable id or index, append new actions, replace by id); mods ship patch-only scenes and the loader merges them onto the base scene before registration so one scene id can be extended without replacing the whole file.

---

## 3. Asset Management

### [ ] 3.1 Preloading strategies (video / audio)

**Proposal:** Define a headless `AssetRegistry` that maps asset ids to URLs (from scene `meta.assets` or a global config) and an optional `AssetLoader` interface (`preload(ids): Promise<void>`); the React (or web) layer implements it using `HTMLVideoElement`/`HTMLAudioElement` or fetch for blobs, and the engine or a small bridge emits a “preload for scene X” signal derived from the current frame’s `meta.assets` so the UI can preload before transitioning.

### [ ] 3.2 Heavy assets in a web context

**Proposal:** Support lazy loading by scope: only preload assets referenced by the current scene and optionally the next N scenes (from a dependency graph or manifest); allow `meta.assets` to specify quality tiers or CDN URLs and document best practices (e.g. range requests for long video, lower-res previews); keep the engine agnostic and push all loading and caching to the adapter (kata-react or a future kata-web-assets package).

---

## 4. Developer Tools

### [ ] 4.1 CLI (kata-cli) — watch .kata and compile to JSON

**Proposal:** Add a `packages/kata-cli` (or `tools/kata-cli`) that uses Bun’s native APIs or chokidar to watch a glob of `*.kata` files, runs `parseKata()` on each change, and writes the resulting KSON scene to a configurable output dir (e.g. `dist/scenes/<id>.json`); support `--watch` and a small config file for input/output paths so dev servers can consume precompiled JSON and authors can keep editing .kata.

### [ ] 4.2 VS Code extension for .kata syntax highlighting

**Proposal:** Ship a VS Code extension that registers a TextMate grammar for `*.kata` (markdown base with injections for frontmatter, `:::if{...}`, `:: Speaker ::`, `* [Choice] -> @target`, and `${...}`), and optionally provide semantic tokens or snippet support so .kata feels first-class in the editor.

---

## 5. Audio System

### [ ] 5.1 Headless Audio Manager (music layers, SFX, fading)

**Proposal:** Define a generic `AudioManager` interface in kata-core (or a new `kata-audio` package) with commands such as `play(id)`, `stop(id)`, `setVolume(id, 0–1)`, `fade(id, toVolume, durationMs)`, and `registerLayer(id, options)` for music layers; the engine (or KSON actions) emit these commands as part of the frame or a dedicated `audio` channel, and a web adapter (e.g. in kata-react or kata-web-audio) implements the interface using the Web Audio API or HTMLAudioElement so the core stays headless and testable with a no-op implementation.

---

## 6. Syntax & Parser Support

### [ ] 6.1 Unify Conditional Syntax
**Proposal:** Standardize `.kata` conditionals to use Remark directives (`:::if{cond="..."}`) and deprecate legacy handlebars-style conditionals (`{{ if condition }}`). Update the `unified`/`remark` plugins to parse this syntax exclusively.

---

## 7. React Adapter (`kata-react`)

### [ ] 7.1 React 19 Transition
**Proposal:** Ensure the UI adapter fully leverages React 19 features where appropriate, ensuring hook constraints and performance optimizations align with React 19 standards.

---

## Summary Table

| Area            | Item                    | Goal                                                                 |
|-----------------|-------------------------|----------------------------------------------------------------------|
| Persistence     | Store serialization     | Snapshot/load API; plain JSON-friendly state.                       |
| Persistence     | Version migrations      | Versioned save format + migrator pipeline.                           |
| Modding         | Layered VFS             | Path-based override across base + mod layers.                       |
| Modding         | Scene merge             | JSON Merge Patch + KSON-aware action merge for mod patches.         |
| Assets          | Preloading              | Registry + loader interface; preload by scene/assets.              |
| Assets          | Heavy assets            | Lazy load by scope; quality/CDN in meta; adapter-side caching.     |
| Developer Tools | kata-cli                | Watch .kata → compile to JSON with configurable paths.              |
| Developer Tools | VS Code extension       | Grammar + injections for .kata.                                     |
| Audio           | Audio Manager           | Headless command interface; web adapter for layers/SFX/fade.        |
| Syntax & Parser | Unify Conditionals      | Standardize on Remark directives (`:::if`), deprecate legacy tags.   |
| React Adapter   | React 19 Transition     | Update `kata-react` to leverage React 19 standards.                 |

All items are designed to keep the runtime headless, KSON as the contract, and React (or any UI) as a thin bridge over the engine and adapters.
