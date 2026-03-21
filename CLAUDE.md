# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Always use Bun** — never npm, pnpm, yarn, node, or vite.

```bash
# Install
bun install

# Build all packages
bun run build

# Run all tests
bun test

# Run tests for a single package
cd packages/kata-core && bun test
cd packages/kata-react && bun test
cd packages/kata-cli && bun test
cd packages/kata-test-utils && bun test

# Run a single test file
bun test packages/kata-core/tests/parser.test.ts

# Versioning / release (Powered by Changesets & GitHub Actions)
bun run changeset          # create a changeset
bun run version            # bump versions
bun run release            # build + publish
```

Each package builds with `tsup` (entry: `index.ts`, outputs CJS + ESM + `.d.ts` into `dist/`).

## Architecture

Bun workspace monorepo with five packages under `packages/`. Workspaces also include `examples/*`.

### `@kata-framework/core` (`packages/kata-core`)

Pure headless engine — no React, no DOM. Internal modules:

| Module | Path | Role |
|--------|------|------|
| Parser | `src/parser/index.ts` | Parses `.kata` files → `KSONScene` using gray-matter (frontmatter), unified/remark (markdown + directives) |
| Store | `src/runtime/store.ts` | Zustand + Immer vanilla store (`createGameStore(initialCtx)`) holding `ctx`, `currentSceneId`, `currentActionIndex`, `history` |
| Runtime | `src/runtime/index.ts` | `KataEngine extends EventEmitter` — registers scenes, drives playback, emits `"update"`, `"end"`, `"audio"`, `"error"`, `"preload"` events. Supports plugins (`use()`), undo (`back()`), and engine options (`historyDepth`) |
| Plugin | `src/runtime/plugin.ts` | `KataPlugin` interface + `PluginManager` — hooks: `beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange` |
| Evaluator | `src/runtime/evaluator.ts` | `evaluate(code, ctx)` and `interpolate(text, ctx)` — **always `new Function`, never `eval`**. Also `evaluateWithDiagnostic()` and `interpolateWithDiagnostic()` for structured error returns |
| Diagnostics | `src/parser/diagnostics.ts` | `parseKataWithDiagnostics(source)` — returns `{ scene, diagnostics: Diagnostic[] }` with validation warnings/errors |
| Snapshot | `src/runtime/snapshot.ts` | `SnapshotManager` — Zod-validated save/load with versioned migration pipeline (`CURRENT_SCHEMA_VERSION`) |
| Audio | `src/audio/index.ts` | `AudioManager` interface + `NoopAudioManager` — fire-and-forget audio actions that auto-advance |
| VFS | `src/vfs/index.ts` | `VFSProvider` interface + `LayeredVFS` — layered virtual file system for mod content overlay |
| Assets | `src/assets/index.ts` | `AssetRegistry` (ID→URL mapping) + `AssetLoader` interface |
| SceneGraph | `src/assets/sceneGraph.ts` | `SceneGraph` — builds connectivity graph from choice targets; `getReachable()`, `getPreloadSet()` for smart asset preloading |
| Modding | `src/modding/mergeScene.ts` | `mergeScene(base, patch)` — RFC 7396-style scene patching (meta merge, action append/replace/remove) |
| Types | `src/types.ts` | `KSONScene`, `KSONAction`, `KSONFrame`, `KSONMeta`, `Choice`, `GameStateSnapshot`, `AudioCommand`, `Diagnostic`, `KataEngineOptions`, `UndoEntry` |

**Data flow:** `.kata` file → `parseKata()` → `KSONScene` → `engine.registerScene()` → `engine.start(id)` → emits `KSONFrame` on each `engine.next()` / `engine.makeChoice()`.

### `@kata-framework/react` (`packages/kata-react`)

React 19 bindings that wrap `KataEngine`:

- `KataProvider` (`src/context.tsx`) — creates a single `KataEngine` instance via `useRef`, exposes it via context.
- `useKataEngine()` — raw engine access from context.
- `useKata()` (`src/useKata.ts`) — uses `useSyncExternalStore` to subscribe to engine events; returns `{ frame, state, actions: { start, next, makeChoice } }`.
- `KataDebug` (`src/KataDebug.tsx`) — optional debug overlay component.

Depends on `@kata-framework/core` via `workspace:*`.

### `@kata-framework/cli` (`packages/kata-cli`)

CLI tool exposing a `kata` binary with two commands:

- `kata build <glob>` — parses `.kata` files and writes `.kson.json` to an output dir (default `dist/kson`)
- `kata watch <glob>` — build + watch for changes

Config resolution: CLI args → `kata.config.json` in CWD → defaults (`**/*.kata`, `dist/kson`). Depends on `@kata-framework/core` via `workspace:*`.

### `@kata-framework/test-utils` (`packages/kata-test-utils`)

Test utility helpers for kata-core consumers:

- `createTestEngine(input, ctx?)` — parses raw `.kata` strings, registers scenes, returns `{ engine, frames }` with live frame collection
- `collectFrames(engine, sceneId, options?)` — auto-advances until end or choice; supports `autoPick` and `maxFrames`
- `assertFrame(frame, expected)` — partial matching on action/state fields with readable error messages
- `mockAudioManager()` — returns `{ handler, commands, lastCommand, reset }` for audio event testing

Depends on `@kata-framework/core` via `workspace:*`.

### `kata-vscode` (`packages/kata-vscode`)

VS Code extension providing syntax highlighting for `.kata` files via a TextMate grammar (`syntaxes/kata.tmLanguage.json`). Private package — not published to npm. Has no build step; package/publish via `vsce`.

## `.kata` File Format

Three sections in order:

1. **YAML frontmatter** — `id`, `title`, `layout`, `assets` (parsed by gray-matter)
2. **`<script>` block** — extracted by regex before markdown parsing
3. **Narrative body** — markdown with remark directives:
   - `[bg src="file.mp4"]` — visual action
   - `:: Speaker :: dialogue text` — text action
   - `* [Choice label] -> @scene/id` — choice list (maps to `Choice[]`)
   - `:::if{cond="expression"} ... :::` — conditional block (evaluated via `evaluate()` at runtime, **not** parse time)
   - `${expression}` — inline variable interpolation in text

Additional KSON action types (used programmatically, not in `.kata` syntax):
- `{ type: "wait", duration: 2000 }` — pause playback
- `{ type: "exec", code: "..." }` — run logic mid-scene
- `{ type: "audio", command: { ... } }` — fire-and-forget audio command

## Key Constraints

- **Security:** All user code runs through `evaluate()` in `src/runtime/evaluator.ts` using `new Function` with an explicit context argument list. Never introduce `eval()`.
- **Headless:** `kata-core` must remain free of DOM/React dependencies.
- **KSON as contract:** UI code should only consume `KSONFrame` — never reach into internal engine state directly.
- Store isolation: Always create the store via `createGameStore(initialCtx)`. Do not share store instances across engine instances.
- Changesets: Any publishable change to `@kata-framework/core` or `@kata-framework/react` needs a changeset (`bun run changeset`) before merging.
- **Roadmap:** After every phase/milestone build, update `ROADMAP.md` — check off completed items, update the current version line, and mark the phase as complete with the date.

## Testing

Tests use `bun:test` (Bun's native test runner). Test files live in `packages/*/tests/`. Core has ~19 test suites covering parser, runtime, logic/evaluator, snapshots, audio, VFS, assets, scene graph, merge, exports, diagnostics (parser/runtime/format), plugins (lifecycle/management), and rewind (basic/state/limits/snapshot). React has an integration test. CLI has a build test. Test-utils has 4 test suites. Pattern is straightforward arrange-act-assert with event listeners for async verification.
