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
cd packages/kata-lsp && bun test
cd packages/kata-sync && bun test
cd packages/kata-devtools && bun test

# Run a single test file
bun test packages/kata-core/tests/parser.test.ts

# Versioning / release (Powered by Changesets & GitHub Actions)
bun run changeset          # create a changeset
bun run version            # bump versions
bun run release            # build + publish
```

## Build

Each package builds with `tsup` (outputs into `dist/`). Notable differences per package:

| Package | Entry | Format | Notes |
|---------|-------|--------|-------|
| `kata-core` | `index.ts` + `src/audio/web-audio.ts` + `src/assets/pipeline.ts` + `src/plugins/*.ts` (8 entries) | CJS + ESM + DTS | Multi-entry for subpath exports |
| `kata-react` | `index.ts` | CJS + ESM + DTS | Externals: `react`, `react-dom`, `@kata-framework/core` |
| `kata-cli` | `src/index.ts` | ESM only | Adds `#!/usr/bin/env bun` shebang banner for CLI execution |
| `kata-test-utils` | `index.ts` | CJS + ESM + DTS | External: `@kata-framework/core` |
| `kata-lsp` | `index.ts` + `src/server.ts` | CJS + ESM + DTS | Two entry points (library + server binary) |
| `kata-sync` | `index.ts` + `src/server/index.ts` | CJS + ESM + DTS | Two entries (client + server subpath); externals: `@kata-framework/core` |
| `kata-vscode` | `src/extension.ts` | CJS (esbuild) | Bundles for VS Code; externals: `vscode` |
| `create-kata` | `index.ts` | ESM only | Adds `#!/usr/bin/env bun` shebang banner for CLI execution |
| `kata-devtools` | `index.ts` + `react.tsx` | CJS + ESM + DTS | Two entries (plugin + React overlay); externals: `react`, `react-dom`, `@kata-framework/core` |
| `docs-playground` | `index.ts` | ESM only | `noExternal` bundles core + react + react-dom into one minified file; private package |

TypeScript uses `"moduleResolution": "bundler"` and `"verbatimModuleSyntax": true` across all packages.

## Architecture

Bun workspace monorepo with eleven packages under `packages/`. Workspaces also include `examples/*`.

### `@kata-framework/core` (`packages/kata-core`)

Pure headless engine — no React, no DOM. Internal modules:

| Module | Path | Role |
|--------|------|------|
| Parser | `src/parser/index.ts` | Parses `.kata` files → `KSONScene` using gray-matter (frontmatter), unified/remark (markdown + directives). Handles `[wait N]`, `[exec]...[/exec]`, `:::if/elseif/else`, `// comments`, `[tween]`, `[tween-group]` |
| Store | `src/runtime/store.ts` | Zustand + Immer vanilla store (`createGameStore(initialCtx)`) holding `ctx`, `currentSceneId`, `currentActionIndex`, `history` |
| Runtime | `src/runtime/index.ts` | `KataEngine extends EventEmitter` — registers scenes, drives playback, emits `"update"`, `"end"`, `"audio"`, `"error"`, `"preload"` events. Supports plugins (`use()`, `getPlugin()`), undo (`back()`), locale (`setLocale()`), and engine options (`historyDepth`, `locale`, `onMissingScene`, `fallbackSceneId`, `evalTimeout`) |
| Plugin | `src/runtime/plugin.ts` | `KataPlugin` interface + `PluginManager` — hooks: `init`, `beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange`, `onEnd` |
| Evaluator | `src/runtime/evaluator.ts` | `evaluate(code, ctx)` and `interpolate(text, ctx)` — **always `new Function`, never `eval`**. Also `evaluateWithDiagnostic()`, `interpolateWithDiagnostic()`, and `createSandboxedExec()`. Blocked globals are shadowed as `undefined`; exec blocks use null-prototype ctx and loop instrumentation |
| Diagnostics | `src/parser/diagnostics.ts` | `parseKataWithDiagnostics(source)` — returns `{ scene, diagnostics: Diagnostic[] }` with validation warnings/errors |
| Snapshot | `src/runtime/snapshot.ts` | `SnapshotManager` — Zod-validated save/load with versioned migration pipeline (`CURRENT_SCHEMA_VERSION`) |
| Audio | `src/audio/index.ts` | `AudioManager` interface + `NoopAudioManager` — fire-and-forget audio actions that auto-advance |
| VFS | `src/vfs/index.ts` | `VFSProvider` interface + `LayeredVFS` — layered virtual file system for mod content overlay |
| Assets | `src/assets/index.ts` | `AssetRegistry` (ID→URL mapping) + `AssetLoader` interface |
| SceneGraph | `src/assets/sceneGraph.ts` | `SceneGraph` — builds connectivity graph from choice targets; `getReachable()`, `getPreloadSet()`, `getOrphans()`, `getDeadEnds()`, `toJSON()`, `toDOT()` |
| Localization | `src/i18n/index.ts` | `LocaleManager` — per-scene locale overrides, fallback chain, YAML parsing (`parseLocaleYaml`) |
| Accessibility | `src/a11y/index.ts` | `generateA11yHints(action)` — pure function producing `A11yHints` for each action type |
| Analytics | `src/plugins/analytics.ts` | `analyticsPlugin()` — tracks scene visits, choice selections, drop-off points |
| Profanity | `src/plugins/profanity.ts` | `profanityPlugin()` — censors text/choice labels with configurable word lists and replacement strategies |
| Auto-Save | `src/plugins/auto-save.ts` | `autoSavePlugin()` — automatic snapshots on scene changes, choices, every action, or timed intervals |
| Logger | `src/plugins/logger.ts` | `loggerPlugin()` — structured lifecycle logging with quiet/normal/verbose levels |
| Content Warnings | `src/plugins/content-warnings.ts` | `contentWarningsPlugin()` — tag scenes with warning labels, fire callbacks before entry |
| Validate | `src/plugins/validate.ts` | `validatePlugin()` — runtime plugin validation, integrated into `engine.use()` |
| Modding | `src/modding/mergeScene.ts` | `mergeScene(base, patch)` — RFC 7396-style scene patching (meta merge, action append/replace/remove) |
| Types | `src/types.ts` | `KSONScene`, `KSONAction`, `KSONFrame`, `KSONMeta`, `Choice`, `GameStateSnapshot`, `AudioCommand`, `Diagnostic`, `KataEngineOptions`, `UndoEntry`, `A11yHints`, `LocaleOverride`, `LocaleData`, `MultiplayerMeta` |

**Data flow:** `.kata` file → `parseKata()` → `KSONScene` → `engine.registerScene()` → `engine.start(id)` → emits `KSONFrame` on each `engine.next()` / `engine.makeChoice()`.

### `@kata-framework/react` (`packages/kata-react`)

React 19 bindings that wrap `KataEngine`:

- `KataProvider` (`src/context.tsx`) — creates a single `KataEngine` instance via `useRef`, exposes it via context.
- `useKataEngine()` — raw engine access from context.
- `useKata()` (`src/useKata.ts`) — uses `useSyncExternalStore` to subscribe to engine events; returns `{ frame, state, actions: { start, next, makeChoice } }`.
- `KataDebug` (`src/KataDebug.tsx`) — optional debug overlay component with ARIA attributes (`role`, `aria-live`, `aria-label`).
- Accessibility hooks (`src/a11y.ts`) — `useReducedMotion()`, `useKeyboardNavigation()`, `useFocusManagement()`.
- `useKataMultiplayer()` (`src/useKataMultiplayer.ts`) — subscribes to `KataSyncManager` events; returns `{ frame, state, players, isAuthority, connectionState, actions: { start, next, makeChoice, connect, disconnect, setChoicePolicy } }`.
- `KataMultiplayerProvider` (`src/multiplayerContext.tsx`) — provides `KataSyncManager` via context.
- `TypewriterText` (`src/TypewriterText.tsx`) — animated text reveal component with configurable speed.
- `SceneTransition` (`src/SceneTransition.tsx`) — scene change transition effects (fade, slide, etc.).
- `TweenProvider` / `TweenTarget` / `useTween` (`src/TweenContext.tsx`, `src/TweenTarget.tsx`, `src/useTween.ts`) — tween animation rendering layer.
- `SaveManager` / `useSaveSlots` (`src/SaveManager.ts`, `src/useSaveSlots.ts`) — save slot management with pluggable `StorageAdapter`.
- `KataErrorBoundary` (`src/KataErrorBoundary.tsx`) — React class component error boundary with `reset()`, `restart()`, `loadLastSave()` recovery actions. Integrates with `SaveManager` for save-based recovery. Accesses engine via `static contextType = KataContext` or `engine` prop.

Depends on `@kata-framework/core` via `workspace:*`. Optional peer dep on `@kata-framework/sync`.

### `@kata-framework/cli` (`packages/kata-cli`)

CLI tool exposing a `kata` binary with three commands:

- `kata build <glob>` — parses `.kata` files and writes `.kson.json` to an output dir (default `dist/kson`)
- `kata watch <glob>` — build + watch for changes
- `kata graph <glob>` — visualize scene connections (`--format dot|json`, `--lint` for orphans/dead ends)

Config resolution: CLI args → `kata.config.json` in CWD → defaults (`**/*.kata`, `dist/kson`). Depends on `@kata-framework/core` via `workspace:*`.

### `@kata-framework/test-utils` (`packages/kata-test-utils`)

Test utility helpers for kata-core consumers:

- `createTestEngine(input, ctx?)` — parses raw `.kata` strings, registers scenes, returns `{ engine, frames }` with live frame collection
- `collectFrames(engine, sceneId, options?)` — auto-advances until end or choice; supports `autoPick` and `maxFrames`
- `assertFrame(frame, expected)` — partial matching on action/state fields with readable error messages
- `mockAudioManager()` — returns `{ handler, commands, lastCommand, reset }` for audio event testing
- `StoryTestRunner` — behavioral test harness; methods: `start`, `advanceUntilChoice`, `advanceUntilText`, `choose(label)`; getters: `currentChoices`, `dialogueLog`, `speakerLog`, `ctx`, `canReach()`

Depends on `@kata-framework/core` via `workspace:*`.

### `@kata-framework/lsp` (`packages/kata-lsp`)

Language Server Protocol implementation for `.kata` files. Provides:

- **Diagnostics** — undefined variables, unreachable scene targets, duplicate scene IDs, invalid conditions
- **Autocomplete** — scene IDs, variable names, asset keys based on cursor context
- **Hover** — variable info, asset URLs, scene target info
- **Go-to-definition** — navigate from `-> @scene/id` to the target file
- **Document symbols** — outline with scene IDs, speakers, choice labels

Architecture: Pure handler functions (`src/diagnostics.ts`, `src/completions.ts`, `src/hover.ts`, `src/definition.ts`, `src/symbols.ts`) + `WorkspaceIndex` (`src/workspace.ts`) for cross-file analysis. Server entry point (`src/server.ts`) uses `vscode-languageserver`. Depends on `@kata-framework/core` via `workspace:*`.

### `kata-vscode` (`packages/kata-vscode`)

VS Code extension providing syntax highlighting, LSP integration, and scene graph visualization for `.kata` files. Launches `@kata-framework/lsp` as language server. Includes `Kata: Show Scene Graph` command (webview with force-directed graph). Published to the VS Code Marketplace as `purukitto.kata-vscode` (private — not published to npm). Builds with esbuild; package/publish via `vsce`.

### `@kata-framework/sync` (`packages/kata-sync`)

Multiplayer sync layer — wraps `KataEngine` with a host-authoritative model. Zero breaking changes to kata-core.

| Module | Path | Role |
|--------|------|------|
| Types | `src/types.ts` | `SyncEvent`, `ConnectionState`, `PlayerInfo`, `ChoicePolicy`, `MultiplayerMeta`, `PlayerPosition` |
| Transport | `src/transport.ts` | `KataSyncTransport` interface — implement per transport |
| SyncManager | `src/sync-manager.ts` | `KataSyncManager extends EventEmitter` — wraps engine, intercepts `start()`/`next()`/`makeChoice()`, handles authority/follower routing |
| Authority | `src/authority.ts` | `AuthorityTracker` — first non-spectator = authority, migration to oldest peer on disconnect |
| ChoicePolicy | `src/choice-policy.ts` | `ChoicePolicyManager` — first-writer, designated player, vote (with timeout + resolver) |
| StatePartition | `src/state-partition.ts` | `StatePartition` — shared/branching modes, per-player snapshots, sync point barriers |
| MockTransport | `src/transports/mock.ts` | In-process mock for testing |
| BroadcastChannel | `src/transports/broadcast-channel.ts` | Same-device transport (browser tabs) |
| WebSocket | `src/transports/websocket.ts` | Networked client transport |
| KataServer | `src/server/index.ts` | WebSocket server — room management, per-room `KataEngine` instances |
| Room | `src/server/room.ts` | `Room` — engine + players + eventLog, authority assignment, intent handling |

**Data flow (authority):** `syncManager.start()` → `engine.start()` → engine emits `"update"` → `KataSyncManager` broadcasts `SyncEvent` to peers → followers emit `"frame"`.

**Data flow (follower):** `syncManager.start()` → sends intent `SyncEvent` to authority → authority processes → broadcasts result → follower receives and emits `"frame"`.

Depends on `@kata-framework/core` via `workspace:*`. Server subpath: `@kata-framework/sync/server`.

### `@kata-framework/devtools` (`packages/kata-devtools`)

In-browser developer toolbar. Two entries:

- `index.ts` — `devtoolsPlugin(options?)` returns a `KataPlugin` that records frames, ctx snapshots, plugin hook timing per-plugin, frame emission latency, and an event log. Wraps every other plugin's hook methods at `init` time and intercepts `engine.use()` and `engine.removePlugin()` to track plugins added later. Returns a no-op shell when `process.env.NODE_ENV === "production"` unless `enabled: true` is forced.
- `react.tsx` — `<KataDevtools plugin={...} position="bottom-right" />` floating overlay with five tabs (Inspector / Timeline / Profiler / Console / Events). Subscribes via `useSyncExternalStore`.

Public plugin API: `getInspectorState()`, `getTimeline()`, `getTimelineEntry(index)`, `getProfilerReport()`, `getEventLog()`, `subscribe(listener)`, `evalExpression(expr)`, `reset()`. Tests live in `tests/devtools-attach.test.ts`, `devtools-inspector.test.ts`, `devtools-profiler.test.ts`. Depends on `@kata-framework/core` via `workspace:*`; `react` is an optional peer dep.

### `create-kata-story` (`packages/create-kata`)

Project scaffolder. `bun create kata-story <name> --template <minimal|react|multiplayer>` generates a ready-to-run narrative project with sample `.kata` scenes, appropriate deps, and template-specific entry points. Also exports `scaffold()`, `normalizeName()`, `validateName()`, `TEMPLATES` for programmatic use.

### `create-kata-plugin` (`packages/create-kata-plugin`)

CLI scaffolder for new plugin projects. `bun create kata-plugin <name>` generates a `kata-plugin-{name}/` directory with src, tests, tsup config, and package.json (peer dep on `@kata-framework/core`). Also exports `scaffold()`, `normalizeName()`, `validateName()` for programmatic use.

### `@kata-framework/docs-playground` (`packages/docs-playground`)

Private, build-time embeddable playground for the docs site. ESM-only, bundles core + react + react-dom via `noExternal` into a single minified file. Exports `mount(el, opts)` for programmatic mounting and `autoMountAll()` for IntersectionObserver-based lazy loading. Consumed by `../purukitto-web` via the sync script; never published to npm.

## `.kata` File Format

Three sections in order:

1. **YAML frontmatter** — `id`, `title`, `layout`, `assets` (parsed by gray-matter)
2. **`<script>` block** — extracted by regex before markdown parsing
3. **Narrative body** — markdown with remark directives:
   - `[bg src="file.mp4"]` — visual action
   - `:: Speaker :: dialogue text` — text action
   - `* [Choice label] -> @scene/id` — choice list (maps to `Choice[]`)
   - `:::if{cond="expression"} ... :::elseif{cond="..."} ... :::else ... :::` — conditional block with branches (evaluated via `evaluate()` at runtime, **not** parse time)
   - `[wait 2000]` — wait action (maps to `{ type: "wait", duration: 2000 }`)
   - `[exec] ... [/exec]` — inline exec block (maps to `{ type: "exec", code: "..." }`)
   - `// comment` — comment line, stripped during parsing
   - `${expression}` — inline variable interpolation in text
   - `[tween target="id" property="x" to="400" duration="800" easing="ease-in-out"]` — tween animation action (fire-and-forget)
   - `[tween-group parallel] ... [/tween-group]` — grouped tweens (parallel or sequence mode)
   - `[audio play channel "src"]`, `[audio stop channel]`, `[audio pause channel]`, `[audio volume channel value]` — audio commands with channel routing

Tween, tween-group, and audio actions are fire-and-forget: the engine emits the frame and auto-advances.

## Key Constraints

- **Security:** All user code runs through `evaluate()` in `src/runtime/evaluator.ts` using `new Function` with an explicit context argument list. Never introduce `eval()`.
- **Headless:** `kata-core` must remain free of DOM/React dependencies.
- **KSON as contract:** UI code should only consume `KSONFrame` — never reach into internal engine state directly.
- Store isolation: Always create the store via `createGameStore(initialCtx)`. Do not share store instances across engine instances.
- Changesets: Any publishable change needs a changeset (`bun run changeset`) before merging.
- **Plugin imports:** Official plugins use subpath exports (`@kata-framework/core/plugins/analytics`, `./profanity`, `./auto-save`, `./logger`, `./content-warnings`, `./validate`). The `KataPlugin` interface stays in the main entry. The main entry does NOT re-export plugin factories.
- **Commits:** Commit changes after completing meaningful units of work (feature, fix, refactor). Write concise conventional-style messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Do NOT add `Co-Authored-By` trailers. Do NOT batch unrelated changes into a single commit.
- **Roadmap:** After every phase/milestone build, update `ROADMAP.md` — check off completed items, update the current version line, and mark the phase as complete with the date.
- **Package READMEs:** Each published package (`packages/*/README.md`) must be updated before release — these are displayed on the npm package page.

## Testing

Tests use `bun:test` (Bun's native test runner). Test files live in `packages/*/tests/`. Pattern is arrange-act-assert with event listeners for async verification.

| Package | Suites | Coverage areas |
|---------|--------|----------------|
| `kata-core` | ~60 | Parser, runtime, evaluator, snapshots, audio, VFS, assets, scene graph, merge, exports, diagnostics, plugins (lifecycle, management, validation, exports, isolation), rewind, syntax extensions, tweens, a11y, locale, analytics, profanity, auto-save, logger, content-warnings, guide examples, missing scene resolution, eval sandbox (timeout, prototype, blocked globals, stack) |
| `kata-react` | ~9 | Integration, save manager, save slots hook, scene transitions, typewriter, tweens, error boundary (render, recovery, isolation) |
| `kata-cli` | 2 | Build + graph commands |
| `kata-test-utils` | 4 | createTestEngine, collectFrames, assertFrame, mockAudioManager |
| `kata-lsp` | 5 | Diagnostics, completions, hover, goto-definition, symbols |
| `kata-sync` | 16 | Sync events, transport interface, authority model, sync manager, BroadcastChannel transport, WebSocket transport, server rooms, choice policies, presence, late join, shared/branching modes, sync points, state partitioning |
| `kata-devtools` | 15 | Plugin attach/detach, NODE_ENV gating, inspector state, timeline ordering, frame detail, event log, profiler hook timing, slowest plugin, frame latency stats, pre-existing plugin wrapping |
| `create-kata` | 1 | Scaffold output, naming, templates (minimal/react/multiplayer) |
| `create-kata-plugin` | 2 | Scaffold output, naming validation |
| `docs-playground` | 2 | Playground parse/render + engine isolation between mounts |

## Parser Patterns

**Pre-extraction:** Block directives like `[exec]...[/exec]` and `[tween-group]...[/tween-group]` are extracted via regex *before* the markdown/remark pipeline runs, replaced with placeholders, then resolved back into KSON actions after parsing. Follow this same pattern when adding new block-level directives.

**Snapshot migrations:** `CURRENT_SCHEMA_VERSION` in `src/runtime/snapshot.ts` tracks the schema version. To add a migration: bump the version, add a Zod schema update, and register a `fromVersion → fromVersion+1` migrator in the `KataEngine` constructor (see the v1→v2 and v2→v3 examples there).

**Plugin pattern:** All official plugins use the closure factory pattern (see `src/plugins/analytics.ts` as reference). Each plugin lives in `src/plugins/{name}.ts`, extends `KataPlugin` with a custom interface, and is importable only via subpath export (`@kata-framework/core/plugins/{name}`). When adding a new plugin: create the source file, add its entry to `tsup.config.ts`, add the subpath to `package.json` `"exports"`, and write tests. Do NOT re-export from `index.ts`. Plugins that need engine access use the `init` hook to capture the engine reference via closure.

**Sync transport pattern:** New transports implement `KataSyncTransport` (in `packages/kata-sync/src/transport.ts`). See `MockTransport` for the simplest reference. The `KataSyncManager` handles authority/follower routing — transports just move `SyncEvent` objects. The server subpath (`@kata-framework/sync/server`) uses Bun.serve for WebSocket rooms; each `Room` gets its own `KataEngine` instance.

**New package scaffolding:** Follow `kata-test-utils` as the template. Required files: `package.json` (with `workspace:*` deps, `"type": "module"`, exports map), `tsconfig.json` (bundler resolution, verbatimModuleSyntax), `tsup.config.ts` (CJS + ESM + DTS, externalize workspace deps), `index.ts` (re-exports from `src/`). The root `package.json` `"workspaces": ["packages/*"]` auto-discovers new packages.

**TypeDoc pattern:** TypeDoc at repo root uses `entryPointStrategy: "expand"` with explicit `entryPoints` pointing at each published package's `index.ts`, plus `typedoc-plugin-markdown` and `typedoc-plugin-frontmatter`. Output goes to `docs-generated/api/` (gitignored). Only the synced copy under `../purukitto-web/src/content/kata-docs/api/` is committed. See `typedoc.json` at repo root.

## Documentation

Docs source lives in `docs/site/` (MDX prose, `examples/*.kata` preloaded scenes, `config.ts` section metadata). API reference is generated by TypeDoc into `docs-generated/api/` (gitignored). Sync to `../purukitto-web`:

- `bun run docs:api` — regenerate API markdown from TypeScript sources
- `bun run docs:sync` — mirror `docs/site/` + `docs-generated/api/` + playground bundle into `purukitto-web`, normalize frontmatter, write manifest
- `bun run docs` — run both in sequence

All kata-related content (prose, API reference, playground source) is authored in this repo. `purukitto-web` is a render target only — it hosts the Astro site at `/kata/docs`. When changing runtime behavior, update the relevant page under `docs/site/` in the same PR.

## Release workflow

Every phase/milestone ends in a coordinated release of the affected packages. The full sequence below was validated on the v1.0.0 cut.

### Prep (per affected package)

1. Write one changeset per publishable package under `.changeset/` with an explicit bump type:
   ```
   ---
   "@kata-framework/<pkg>": major | minor | patch
   ---
   ```
2. Commit the changesets (`chore(release): add <name> changesets`).

### Prep run

Run `bun run release:prep` — this chains `changeset version` → `bun test` → `bun run build` → `bun run docs`. On success:

- All `packages/*/package.json` and `CHANGELOG.md` are bumped.
- Tests and builds are green.
- `docs-generated/api/` and `../purukitto-web/src/content/kata-docs/` are refreshed with the new versions; the sync manifest reflects the bump.

### Verify versions before publishing

`changeset version` propagates bumps through workspace dependents. **A major bump on a dependency (e.g. `kata-core`) forces a major bump on every consumer regardless of that consumer's own changeset type.** This bit us on v1.0.0: `kata-react` had a `minor` changeset (`1.2.0 → 1.3.0`) but was auto-promoted to `2.0.0` because `kata-core` went major.

After running `release:prep`, always `grep '"version"' packages/*/package.json` and sanity-check each package matches the target from the phase plan. If a package got over-bumped:

1. Manually edit its `package.json` `version` field back to the intended value.
2. Edit its `CHANGELOG.md` top heading (`## X.Y.Z`) to match.
3. `workspace:*` consumers are untouched — publish-time resolution still works.

This manual override is safe because `changeset publish` reads the literal `version` field at publish time; it does not re-derive it.

### Commit, publish, tag

1. `git add -A && git commit -m "chore(release): vX.Y.Z"`
2. `bun run release` — builds once more and runs `changeset publish`, which publishes every package whose local version is ahead of npm. Changesets also creates per-package git tags.
3. `git tag -a vX.Y.Z -m "Kata Framework vX.Y.Z"` — an umbrella tag for the phase/milestone.
4. `git push origin main --follow-tags`
5. `gh release create vX.Y.Z --title "..." --notes "..."` — GitHub release built from the CHANGELOG entries.

### Sync the docs site

1. `cd ../purukitto-web && git add -A && git commit -m "docs(kata): sync vX.Y.Z release manifest and API reference"`
2. `git push origin main` — Vercel deploys the refreshed docs site.

### Update ROADMAP.md

Check off the phase, stamp it with today's date, update the current-version line. Commit separately if not already bundled with the version commit.
