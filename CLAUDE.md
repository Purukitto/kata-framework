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

# Run a single test file
bun test packages/kata-core/tests/parser.test.ts

# Versioning / release
bun run changeset          # create a changeset
bun run version            # bump versions
bun run release            # build + publish
```

Each package builds with `tsup` (entry: `index.ts`, outputs CJS + ESM + `.d.ts` into `dist/`).

## Architecture

Bun workspace monorepo with two published packages under `packages/`:

### `@kata-framework/core` (`packages/kata-core`)
Pure engine — no React, no DOM. Three internal modules:

| Module | Path | Role |
|--------|------|------|
| Parser | `src/parser/index.ts` | Parses `.kata` files → `KSONScene` using gray-matter (frontmatter), unified/remark (markdown + directives) |
| Store | `src/runtime/store.ts` | Zustand + Immer vanilla store (`createGameStore(initialCtx)`) holding `ctx`, `currentSceneId`, `currentActionIndex`, `history` |
| Runtime | `src/runtime/index.ts` | `KataEngine extends EventEmitter` — registers scenes, drives playback, emits `"update"` (KSONFrame) and `"end"` events |
| Evaluator | `src/runtime/evaluator.ts` | `evaluate(code, ctx)` and `interpolate(text, ctx)` — **always `new Function`, never `eval`** |
| Types | `src/types.ts` | `KSONScene`, `KSONAction`, `KSONFrame`, `KSONMeta`, `Choice` |

**Data flow:** `.kata` file → `parseKata()` → `KSONScene` → `engine.registerScene()` → `engine.start(id)` → emits `KSONFrame` on each `engine.next()` / `engine.makeChoice()`.

### `@kata-framework/react` (`packages/kata-react`)
React 19 bindings that wrap `KataEngine`:

- `KataProvider` (`src/context.tsx`) — creates a single `KataEngine` instance via `useRef`, exposes it via context.
- `useKataEngine()` — raw engine access from context.
- `useKata()` (`src/useKata.ts`) — subscribes to `"update"` and `"end"` events; returns `{ frame, state, actions: { start, next, makeChoice } }`.
- `KataDebug` (`src/KataDebug.tsx`) — optional debug overlay component.

`kata-react` depends on `@kata-framework/core` via `workspace:*`.

## `.kata` File Format

Three sections in order:

1. **YAML frontmatter** — `id`, `title`, `layout`, `assets` (parsed by gray-matter)
2. **`<script>` block** — extracted by regex before markdown parsing
3. **Narrative body** — markdown with remark directives:
   - `[bg src="file.mp4"]` — visual action
   - `:: Speaker :: dialogue text` — text action
   - `* [Choice label] -> @scene/id` — choice list (maps to `Choice[]`)
   - `:::if{cond="expression"} ... :::` — conditional block (evaluated via `evaluate()` at runtime, **not** parse time)

## Key Constraints

- **Security:** All user code runs through `evaluate()` in `src/runtime/evaluator.ts` using `new Function` with an explicit context argument list. Never introduce `eval()`.
- **Headless:** `kata-core` must remain free of DOM/React dependencies.
- **KSON as contract:** UI code should only consume `KSONFrame` — never reach into internal engine state directly.
- **Store isolation:** Always create the store via `createGameStore(initialCtx)`. Do not share store instances across engine instances.
- **Changesets:** Any publishable change to `kata-core` or `kata-react` needs a changeset (`bun run changeset`) before merging.
