# Kata Framework — Roadmap

> **Every feature on this roadmap follows Test-Driven Development.**
> Write failing tests first. Implement until green. Refactor. No feature ships without coverage.
>
> Each phase is a versioned release. At the end of every phase:
> 1. All new tests pass (`bun test`)
> 2. Root README is updated with guide-like documentation for every new user-facing feature
> 3. **Package READMEs updated** (`packages/*/README.md`) — these are displayed on the npm package page
> 4. **Commit all changes** — use conventional commit messages (`feat:`, `fix:`, etc.), no `Co-Authored-By` trailers
> 5. Changeset is created and packages are published
> 6. **This roadmap is updated** — check off completed items, update current version

Current version: `0.9.0` — Parser, runtime, store, audio, save/load, modding (VFS + scene merge), asset preloading, React bindings, CLI, VS Code syntax highlighting, plugin system, undo/rewind, error diagnostics, test utilities, LSP (diagnostics, autocomplete, hover, go-to-def, symbols), scene graph visualization (CLI + VS Code), syntax extensions (`[wait]`, `[exec]`, `:::else`/`:::elseif`, comments, `[audio]`), localization (i18n), branching analytics plugin, accessibility (a11y hints + React ARIA/keyboard hooks), animation/tween timelines, plugin ecosystem (subpath exports, profanity filter, auto-save, debug logger, content warnings, validation utility, plugin scaffolder, authoring guide), multiplayer (sync protocol, BroadcastChannel + WebSocket transports, host-authoritative rooms, choice policies, player presence, state partitioning, React hook), Web Audio (`WebAudioManager` with channels, crossfading, autoplay policy), asset pipeline (`AssetPipeline` with LRU cache, concurrent loading, progress tracking), `.kata` audio syntax (`[audio play/stop/pause/volume]`), production React layer (`TypewriterText`, `SceneTransition`, `TweenTarget`/`useTween`, `SaveManager`/`useSaveSlots`), **runtime resilience (graceful scene resolution, evaluation sandbox hardening, React error boundary)**.

---

## Completed Phases (v0.1.0 — v0.8.0)

**Phase 1 — Engine Extensibility `v0.2.0`** (2026-03-21): Plugin/middleware system with lifecycle hooks (`beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange`, `onEnd`), `@kata-framework/test-utils` package, undo/rewind with configurable history depth, structured error diagnostics for parser and runtime.

**Phase 2 — Content Authoring `v0.3.0`** (2026-03-21): LSP with diagnostics, autocomplete, hover, go-to-definition, document symbols. Scene graph visualization in CLI (`kata graph`) and VS Code webview. Syntax extensions: `[wait N]`, `[exec]...[/exec]`, `:::elseif`/`:::else`, `// comments`.

**Phase 3 — Reach & Intelligence `v0.4.0`** (2026-03-22): Localization (per-scene YAML overrides, fallback chains, VFS integration). Branching analytics plugin. Accessibility (a11y hints in KSONFrame, React ARIA/keyboard hooks, reduced-motion support). Animation/tween timeline actions (`[tween]`, `[tween-group]`).

**Phase 4 — Plugin Ecosystem `v0.5.0`** (2026-03-23): Tree-shakeable subpath exports (`@kata-framework/core/plugins/*`). Official plugins: profanity filter, auto-save, debug logger, content warnings, validation utility. Plugin authoring guide, `create-kata-plugin` scaffolder, plugin catalog.

**Phase 5 — Multiplayer `v0.6.0`** (2026-04-05): `@kata-framework/sync` package. Sync protocol with host-authoritative model. Transports: BroadcastChannel (same-device) and WebSocket (networked). Server with room management. Choice policies (first-writer, designated, vote). Player presence and spectator mode. State partitioning (shared vs branching) with sync points. React `useKataMultiplayer()` hook.

**Phase 6 — Web Audio & Asset Pipeline `v0.7.0`** (2026-04-09): `WebAudioManager` — concrete Web Audio API implementation with channel-based architecture (bgm/sfx/voice), crossfading, per-channel + master volume, mute/unmute, autoplay policy queue, `AudioBufferCache` (LRU). `AssetPipeline` — concurrent fetch queue (`maxConcurrent`), `AssetCache` (LRU with configurable max size), `PreloadHandle` with `onProgress` callback, type-aware decoding (JSON/audio/image). `.kata` audio syntax: `[audio play channel "src"]`, `[audio stop channel]`, `[audio pause channel]`, `[audio volume channel value]` with parser diagnostics. `AudioCommand` type extended with `channel`, `src`, `pause`, `volume` actions (backward-compatible). Subpath exports: `@kata-framework/core/audio`, `@kata-framework/core/assets`. 44 new tests (330 total in kata-core).

**Phase 7 — Production React Layer `v0.8.0`** (2026-04-11): `TypewriterText` — character-by-character text reveal with `requestAnimationFrame`, skip-on-click, `prefers-reduced-motion` support, `aria-label`/`aria-live` accessibility. `SceneTransition` — dual-container CSS transitions (fade, slide-left, dissolve, none) with lifecycle management, rapid-change handling, reduced-motion instant swap. `TweenTarget`/`useTween` — context-based tween style distribution mapping KSON tween properties (x, y, opacity, scale, rotation) to CSS transforms/transitions. `SaveManager` — storage-agnostic save slot manager with `StorageAdapter` interface, `localStorage` built-in, LRU slot metadata, auto-save slot support. `useSaveSlots` — reactive React hook for save/load/remove with engine integration. `TweenProvider` auto-included in `KataProvider`. 42 new tests (585 monorepo-wide).

**Phase 8 — Runtime Resilience & Error Recovery `v0.9.0`** (2026-04-12): Graceful scene target resolution — `onMissingScene` option with `"throw"` (default), `"error-event"`, and `"fallback"` strategies; `fallbackSceneId` with `ctx._errorSceneId` injection. Expression evaluation sandbox hardening — blocked globals (`process`, `require`, `fetch`, `XMLHttpRequest`, `globalThis`, `window`, `self`, `global`, `__proto__`, `constructor`) shadowed as `undefined`; loop guard instrumentation for exec blocks with configurable `evalTimeout`; null-prototype context for exec blocks preventing prototype traversal. `KataErrorBoundary` — React class component error boundary with `reset()`, `restart()`, `loadLastSave()` recovery actions, `SaveManager` integration, `onError` callback. 51 new tests (636 monorepo-wide).

---

### 6.1 Web Audio Manager

**What:** A concrete `AudioManager` implementation using the Web Audio API that handles BGM, SFX, voice lines, crossfading, volume control, and spatial audio basics.

**Why:** `NoopAudioManager` is the only implementation. Every narrative game needs music and sound effects. Without a real audio layer, the framework forces every consumer to build their own from scratch.

**API surface:**

```ts
import { WebAudioManager } from "@kata-framework/core/audio";

const audio = new WebAudioManager({
  basePath: "/assets/audio/",
  masterVolume: 0.8,
  channels: {
    bgm: { volume: 0.6, loop: true, crossfadeDuration: 1000 },
    sfx: { volume: 1.0, loop: false },
    voice: { volume: 1.0, loop: false },
  },
});

engine.on("audio", audio.handler);

// Manual controls
audio.setVolume("bgm", 0.3);
audio.mute("sfx");
audio.stopAll();
audio.resume(); // handle browser autoplay policy
```

**Audio commands supported:**

| Command | Behavior |
|---------|----------|
| `{ action: "play", channel: "bgm", src: "night-rain.mp3" }` | Starts playback, crossfades if BGM already playing |
| `{ action: "play", channel: "sfx", src: "click.wav" }` | Plays one-shot, overlaps with BGM |
| `{ action: "stop", channel: "bgm" }` | Fades out and stops |
| `{ action: "pause", channel: "bgm" }` | Pauses (resume with `play`) |
| `{ action: "volume", channel: "bgm", value: 0.5 }` | Adjusts channel volume |

**TDD test plan:**
1. `web-audio-playback.test.ts`
   - Playing BGM creates an AudioBufferSourceNode and connects to gain node
   - Playing a second BGM track crossfades (old fades out, new fades in over `crossfadeDuration`)
   - SFX plays independently without interrupting BGM
   - Stop command fades out over 200ms then disconnects
   - Pause command suspends the AudioContext timeline
2. `web-audio-volume.test.ts`
   - Master volume scales all channels
   - Per-channel volume works independently
   - Mute sets gain to 0, unmute restores previous gain
   - Volume changes are applied immediately (not on next play)
3. `web-audio-loading.test.ts`
   - Audio files are fetched and decoded on first play
   - Decoded buffers are cached (second play is instant)
   - Failed fetch emits an error event, does not crash
   - Preloading a list of audio files decodes them ahead of time
4. `web-audio-autoplay.test.ts`
   - Handles browser autoplay policy (AudioContext starts suspended)
   - `resume()` resumes AudioContext after user gesture
   - Queued play commands execute after resume

**Implementation:**
- New file: `src/audio/web-audio.ts` in `kata-core`
- Subpath export: `@kata-framework/core/audio`
- Uses only the Web Audio API (no external dependencies)
- `AudioBufferCache` — internal LRU cache for decoded audio buffers
- Browser-only — headless environments (Bun, Node) get `NoopAudioManager` automatically
- Tests use `AudioContext` mock (or `web-audio-api` polyfill for Bun)

---

### 6.2 Asset Loader & Cache

**What:** A concrete `AssetLoader` implementation that fetches, decodes, caches, and tracks loading progress for images, audio, and data files.

**Why:** `AssetLoader` is an interface with no implementation. `AssetRegistry` maps IDs to URLs but doesn't load anything. The `preload` event fires but nothing handles it. Games need assets loaded before scenes render, with progress bars and error recovery.

**API surface:**

```ts
import { AssetPipeline } from "@kata-framework/core/assets";

const pipeline = new AssetPipeline({
  basePath: "/assets/",
  maxConcurrent: 4,
  cacheStrategy: "memory",  // "memory" | "cache-api" | "none"
});

// Preload a set of assets with progress
const handle = pipeline.preload(["bg/forest.jpg", "audio/wind.mp3", "sprites/hero.png"]);
handle.onProgress((loaded, total) => updateProgressBar(loaded / total));
await handle.complete;  // resolves when all loaded

// Get a loaded asset
const image = pipeline.get<HTMLImageElement>("bg/forest.jpg");

// Integrate with engine preload events
engine.on("preload", (assets) => pipeline.preload(assets.map(a => a.url)));
```

**TDD test plan:**
1. `asset-loader.test.ts`
   - Loading an image URL returns an `HTMLImageElement`
   - Loading an audio URL returns an `ArrayBuffer` (for Web Audio decoding)
   - Loading a JSON URL returns parsed JSON
   - Failed fetch rejects with descriptive error including URL
2. `asset-cache.test.ts`
   - Second request for the same URL returns cached result (no network fetch)
   - `cache.clear()` evicts all entries
   - `cache.evict(url)` removes a single entry
   - Memory cache enforces max size (LRU eviction)
3. `asset-progress.test.ts`
   - `onProgress` fires for each completed asset
   - Progress goes from 0 to total
   - Partial failures still report progress for successful items
   - `complete` promise resolves even if some assets fail (errors collected)
4. `asset-concurrency.test.ts`
   - No more than `maxConcurrent` fetches are in-flight simultaneously
   - Queued fetches are processed as in-flight ones complete
5. `asset-engine-integration.test.ts`
   - Registering `AssetPipeline` with engine auto-preloads on scene change
   - Scene does not start until critical assets are loaded (optional blocking mode)

**Implementation:**
- New file: `src/assets/pipeline.ts` in `kata-core`
- Subpath export: `@kata-framework/core/assets`
- `AssetPipeline` — orchestrates `AssetLoader` + `AssetCache` + `ProgressTracker`
- `AssetCache` — LRU cache with configurable max size, supports `memory` and `Cache API` strategies
- `ProgressTracker` — EventEmitter-based progress reporting
- Concurrent fetch queue with configurable parallelism

---

### 6.3 `.kata` Audio Syntax

**What:** First-class audio directives in `.kata` files so authors can trigger music and sound effects inline with narrative, without writing KSON manually.

**Why:** Audio actions exist in KSON (`{ type: "audio", command: {...} }`) but have no `.kata` syntax. Authors must build audio actions programmatically. This is the only action type without a corresponding `.kata` directive.

**New syntax:**

```kata
:: Narrator :: The rain begins to fall.

[audio play bgm "night-rain.mp3"]

:: Narrator :: A distant rumble of thunder.

[audio play sfx "thunder.wav"]

:: Narrator :: The storm passes.

[audio stop bgm]
[audio volume bgm 0.3]
```

| Syntax | Maps To |
|--------|---------|
| `[audio play <channel> "<src>"]` | `{ type: "audio", command: { action: "play", channel, src } }` |
| `[audio stop <channel>]` | `{ type: "audio", command: { action: "stop", channel } }` |
| `[audio pause <channel>]` | `{ type: "audio", command: { action: "pause", channel } }` |
| `[audio volume <channel> <value>]` | `{ type: "audio", command: { action: "volume", channel, value } }` |

**TDD test plan:**
1. `parse-audio.test.ts`
   - `[audio play bgm "file.mp3"]` parses to correct audio action
   - `[audio stop sfx]` parses to stop command
   - `[audio volume bgm 0.5]` parses to volume command with numeric value
   - Missing channel produces a diagnostic
   - Missing src for `play` command produces a diagnostic
   - Unknown action verb produces a diagnostic
2. `runtime-audio-syntax.test.ts`
   - Audio actions from `.kata` syntax emit `"audio"` events correctly
   - Audio actions auto-advance (fire-and-forget)
   - Multiple audio actions in sequence all fire

**Implementation:**
- Add regex-based handler in parser for `[audio ...]` directives
- Follows the same pattern as `[wait N]` and `[tween ...]` — parsed to KSON action, engine emits and auto-advances
- No engine changes required — uses existing `"audio"` event path

---

### Phase 6 Release Checklist

- [x] All new tests green (44 new tests, 330 total in kata-core, 543 monorepo-wide)
- [x] Web Audio Manager with channels, crossfading, autoplay policy, LRU buffer cache
- [x] Asset pipeline preloads with progress feedback, concurrent fetch queue, LRU cache
- [x] `.kata` audio syntax: `[audio play/stop/pause/volume]` with parser diagnostics
- [x] Subpath exports added: `@kata-framework/core/audio`, `@kata-framework/core/assets`
- [x] Package READMEs updated (`kata-core`)
- [x] Changesets created for `kata-core` (minor)
- [x] `bun run release` — published `@kata-framework/core@0.7.0`

---

## Phase 7 — Production React Layer `v0.8.0`

The React bindings work. Now make them production-quality — typewriter text, scene transitions, tween rendering, save slot management, and a real audio integration hook.

---

### 7.1 Typewriter Text Component

**What:** A `<TypewriterText>` component that renders dialogue text character-by-character with configurable speed, skip-on-click, and completion callback.

**Why:** Every visual novel has typewriter text. It's the single most expected UI behavior in the genre. Currently, dialogue appears as an instant block of text.

**API surface:**

```tsx
import { TypewriterText } from "@kata-framework/react";

<TypewriterText
  text="The door creaks open slowly..."
  speed={30}              // ms per character (default: 30)
  onComplete={() => {}}   // fires when fully revealed
  skip={false}            // set true to instantly reveal
  className="dialogue"
/>
```

**TDD test plan:**
1. `typewriter-render.test.ts`
   - Text appears progressively over time (not all at once)
   - After `text.length * speed` ms, all text is visible
   - `onComplete` fires when last character is rendered
2. `typewriter-skip.test.ts`
   - Setting `skip={true}` reveals all text instantly
   - Clicking the component triggers `onComplete` immediately
   - `onComplete` fires exactly once even with rapid clicks
3. `typewriter-rerender.test.ts`
   - Changing `text` prop resets the animation from the beginning
   - Previous animation is cancelled cleanly (no orphaned timers)
4. `typewriter-a11y.test.ts`
   - Full text is available to screen readers via `aria-label` even during animation
   - `aria-live="polite"` announces text after completion, not mid-animation
5. `typewriter-reduced-motion.test.ts`
   - When `prefers-reduced-motion` is active, text appears instantly

**Implementation:**
- New component in `packages/kata-react/src/TypewriterText.tsx`
- Uses `requestAnimationFrame` loop for smooth character reveal
- Exported from `@kata-framework/react`
- Pure CSS for cursor blink animation (no JS animation library)

---

### 7.2 Scene Transition System

**What:** Configurable enter/exit transitions between scenes — fade, slide, dissolve — driven by scene metadata or engine events.

**API surface:**

```tsx
import { SceneTransition } from "@kata-framework/react";

<SceneTransition
  sceneId={frame.meta.id}
  transition="fade"        // "fade" | "slide-left" | "dissolve" | "none"
  duration={500}
>
  <BackgroundLayer src={background} />
  <DialogueBox ... />
</SceneTransition>
```

**TDD test plan:**
1. `transition-fade.test.ts`
   - Scene change applies `scene-exit` CSS class to old content
   - After exit duration, applies `scene-enter` CSS class to new content
   - Both old and new content are in DOM during crossfade
2. `transition-types.test.ts`
   - `"fade"` uses opacity transition
   - `"slide-left"` uses transform translateX
   - `"dissolve"` uses CSS mix-blend-mode
   - `"none"` swaps instantly
3. `transition-reduced-motion.test.ts`
   - All transitions are instant when `prefers-reduced-motion` is active
4. `transition-rapid.test.ts`
   - Rapid scene changes don't leave orphaned transition states
   - Only the latest scene is visible after transitions settle

**Implementation:**
- New component in `packages/kata-react/src/SceneTransition.tsx`
- CSS-only transitions (no JS animation library)
- Uses React `key` prop on scene ID to trigger mount/unmount
- `useReducedMotion()` hook (already exists) to skip transitions

---

### 7.3 Tween Renderer

**What:** A React component/hook that interprets tween frames from the engine and applies CSS transforms/animations to target DOM elements.

**Why:** Tween actions exist in KSON and are emitted by the engine, but the React layer ignores them. Authors can write `[tween target="stranger" property="x" to="400" duration="800"]` in `.kata` files, but nothing happens visually.

**API surface:**

```tsx
import { useTween, TweenTarget } from "@kata-framework/react";

function GameScene({ frame }) {
  const tweenRef = useTween(frame); // subscribes to tween frames

  return (
    <div>
      <TweenTarget id="stranger" ref={tweenRef}>
        <img src="stranger.png" />
      </TweenTarget>
    </div>
  );
}
```

**TDD test plan:**
1. `tween-apply.test.ts`
   - A tween frame with `property: "x", to: 400` applies `transform: translateX(400px)`
   - A tween frame with `property: "opacity", to: 0` applies `opacity: 0`
   - Duration and easing are applied via CSS `transition` property
2. `tween-group.test.ts`
   - `parallel` tween-group applies all tweens simultaneously
   - `sequence` tween-group applies tweens one after another
3. `tween-target.test.ts`
   - Only the element with the matching `id` receives the tween
   - Tweens targeting unknown IDs are silently ignored
4. `tween-reduced-motion.test.ts`
   - All tweens are instant when `prefers-reduced-motion` is active

**Implementation:**
- New hook: `packages/kata-react/src/useTween.ts`
- New component: `packages/kata-react/src/TweenTarget.tsx`
- Maps KSON tween properties to CSS properties via a lookup table
- Uses CSS `transition` for animations (no JS animation library required)
- Optional: support Web Animations API for more complex sequences

---

### 7.4 Save Slot Manager

**What:** A complete save/load system with `localStorage` persistence, slot management, thumbnail previews, and auto-save integration.

**API surface:**

```tsx
import { SaveManager, useSaveSlots } from "@kata-framework/react";

// Storage adapter (ships with localStorage, extensible)
const saves = new SaveManager({
  storage: "localStorage",     // "localStorage" | "indexedDB" | custom adapter
  prefix: "kata-my-game",
  maxSlots: 10,
  autoSaveSlot: 0,             // reserved slot for auto-save
});

function SaveMenu() {
  const { slots, save, load, remove } = useSaveSlots(saves);

  return slots.map(slot => (
    <div key={slot.index}>
      <span>{slot.isEmpty ? "Empty" : slot.sceneName}</span>
      <span>{slot.timestamp && new Date(slot.timestamp).toLocaleString()}</span>
      <button onClick={() => save(slot.index)}>Save</button>
      <button onClick={() => load(slot.index)} disabled={slot.isEmpty}>Load</button>
      <button onClick={() => remove(slot.index)} disabled={slot.isEmpty}>Delete</button>
    </div>
  ));
}
```

**TDD test plan:**
1. `save-manager.test.ts`
   - `save(slotIndex, snapshot)` writes to storage with prefix
   - `load(slotIndex)` reads and deserializes correctly
   - `remove(slotIndex)` clears the slot
   - `getSlots()` returns metadata for all slots (timestamp, sceneId, isEmpty)
   - Max slots are enforced
2. `save-localStorage.test.ts`
   - Data persists across `SaveManager` instances (same prefix)
   - Different prefixes are isolated
   - Corrupted data is handled gracefully (returns empty slot)
3. `save-autoSave.test.ts`
   - Auto-save plugin writes to the reserved slot via `onSave` callback
   - Auto-save slot is visually distinguished in `useSaveSlots`
4. `save-migration.test.ts`
   - Loading a snapshot from an older schema version triggers engine migration
   - Migrated snapshot loads correctly
5. `save-hook.test.ts`
   - `useSaveSlots` returns reactive slot data
   - Saving updates the slot list immediately
   - Loading triggers engine `loadSnapshot` and re-renders

**Implementation:**
- New file: `packages/kata-react/src/SaveManager.ts` — storage-agnostic manager
- New file: `packages/kata-react/src/useSaveSlots.ts` — React hook
- `LocalStorageAdapter` — built-in, `IndexedDBAdapter` — optional
- Storage adapter interface for custom backends (cloud saves, etc.)
- Exported from `@kata-framework/react`

---

### Phase 7 Release Checklist

- [x] All new tests green (42 new tests, 585 monorepo-wide)
- [x] Typewriter text with skip, a11y, and reduced-motion support
- [x] Scene transitions (fade, slide, dissolve) working
- [x] Tween renderer applies CSS transforms from engine tween frames
- [x] Save slot manager with localStorage persistence
- [x] Package READMEs updated (`kata-react`)
- [x] Changesets created for `kata-react` (minor)
- [x] `bun run release` — published `@kata-framework/react@0.8.0`

---

## Phase 8 — Runtime Resilience & Error Recovery `v0.9.0`

The engine works when everything goes right. Now make it work when things go wrong — graceful fallbacks, error boundaries, runtime validation, and developer-friendly error messages.

---

### 8.1 Graceful Scene Target Resolution

**What:** When a choice targets a scene that doesn't exist (`-> @nonexistent/scene`), the engine should recover gracefully instead of throwing an unrecoverable error.

**Current behavior:** `engine.start("nonexistent")` throws `Error: Scene "nonexistent" not found`, crashing the entire game.

**New behavior:**

```ts
const engine = new KataEngine(ctx, {
  onMissingScene: "error-event",  // "throw" (default for backward compat) | "error-event" | "fallback"
  fallbackSceneId: "error-scene", // used when onMissingScene is "fallback"
});

engine.on("error", (diagnostic) => {
  // { level: "error", message: "Scene \"x\" not found, falling back to \"error-scene\"", ... }
});
```

**Recovery strategies:**

| Strategy | Behavior |
|----------|----------|
| `"throw"` | Current behavior — throws (backward compatible default) |
| `"error-event"` | Emits `"error"` event, stays on current scene, does not crash |
| `"fallback"` | Emits `"error"` event, transitions to `fallbackSceneId` |

**TDD test plan:**
1. `missing-scene-throw.test.ts`
   - Default behavior: `start("x")` throws when scene is missing (backward compat)
   - `makeChoice()` with invalid target throws
2. `missing-scene-event.test.ts`
   - With `onMissingScene: "error-event"`: emits error, stays on current scene
   - Current frame is re-emitted (UI doesn't go blank)
   - Error includes the missing scene ID and the referring scene/action
3. `missing-scene-fallback.test.ts`
   - With `onMissingScene: "fallback"`: transitions to `fallbackSceneId`
   - Error event still fires (for logging)
   - Fallback scene receives the missing scene ID via `ctx._errorSceneId`
   - If fallback scene is also missing: emits error and stays on current scene (no infinite loop)

**Implementation:**
- New `onMissingScene` and `fallbackSceneId` options in `KataEngineOptions`
- Wrap `start()` and `makeChoice()` target resolution in try/catch
- Emit `"error"` event for non-throw strategies
- No breaking changes — default is `"throw"`

---

### 8.2 Expression Evaluation Sandbox Hardening

**What:** Make `evaluate()` and `interpolate()` more resilient — catch infinite loops, stack overflows, and prototype pollution attempts.

**Why:** `new Function` can hang on `while(true){}`, access `constructor.constructor` to escape the sandbox, or throw on any syntax error. Production games with user-generated content (mods) need hardened evaluation.

**New safeguards:**

| Guard | Mechanism |
|-------|-----------|
| **Timeout** | Wrap evaluation in a `setTimeout` watchdog — kill after 100ms (configurable) |
| **Prototype freeze** | Freeze `ctx.__proto__` and `Object.prototype` during evaluation |
| **Blocked globals** | Deny access to `process`, `require`, `import`, `fetch`, `XMLHttpRequest` |
| **Stack depth limit** | Catch `RangeError: Maximum call stack size exceeded` gracefully |

**TDD test plan:**
1. `eval-timeout.test.ts`
   - `evaluate("while(true){}", ctx)` returns an error after timeout, does not hang
   - Normal expressions complete well under timeout
   - Timeout is configurable via engine options
2. `eval-prototype.test.ts`
   - `evaluate("this.constructor.constructor('return process')()", ctx)` is blocked
   - `ctx.__proto__` modifications do not leak to global prototype
3. `eval-blocked-globals.test.ts`
   - Expressions referencing `process`, `require`, `fetch` return undefined or error
   - `ctx` variables are still accessible
4. `eval-stack.test.ts`
   - Recursive expressions that blow the stack return an error, do not crash
   - Error includes the expression that caused the overflow

**Implementation:**
- Enhance `src/runtime/evaluator.ts`
- Use `new Function` with a blocklist of global names passed as parameters (shadowed to `undefined`)
- `Object.freeze(ctx.__proto__)` before evaluation, restore after
- Timeout via `AbortController` + `Promise.race` (or Web Worker for true isolation in browser)
- Configurable via `KataEngineOptions.evalTimeout` (default: 100ms)

---

### 8.3 React Error Boundary

**What:** A `<KataErrorBoundary>` component that catches rendering errors in kata-powered React apps and shows a recovery UI instead of a white screen.

**API surface:**

```tsx
import { KataErrorBoundary } from "@kata-framework/react";

<KataErrorBoundary
  fallback={({ error, reset }) => (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
  onError={(error, info) => {
    // Log to analytics, error tracking, etc.
  }}
>
  <StudioView />
</KataErrorBoundary>
```

**Recovery actions:**

| Action | What it does |
|--------|-------------|
| `reset()` | Re-mounts children, retries rendering |
| `restart()` | Calls `engine.start()` on the current scene from the beginning |
| `loadLastSave()` | Loads the most recent auto-save snapshot |

**TDD test plan:**
1. `error-boundary-render.test.ts`
   - Rendering error in child shows fallback UI, not white screen
   - `error` prop in fallback contains the actual error
   - `onError` callback fires with error and React component stack
2. `error-boundary-recovery.test.ts`
   - `reset()` re-mounts children
   - `restart()` calls `engine.start()` with current scene ID
   - `loadLastSave()` loads auto-save snapshot if available
3. `error-boundary-isolation.test.ts`
   - Errors in one `<KataErrorBoundary>` don't affect siblings
   - Nested boundaries catch at the nearest level

**Implementation:**
- New component: `packages/kata-react/src/KataErrorBoundary.tsx`
- React class component (error boundaries require `componentDidCatch`)
- Integrates with `SaveManager` for `loadLastSave()` recovery
- Exported from `@kata-framework/react`

---

### Phase 8 Release Checklist

- [x] All new tests green (51 new tests, 636 monorepo-wide)
- [x] `onMissingScene` with all three strategies working
- [x] Evaluation sandbox hardened against loops, prototype pollution, blocked globals
- [x] `<KataErrorBoundary>` catches render errors with recovery UI
- [x] Package READMEs updated (`kata-core`, `kata-react`)
- [x] Changesets created for `kata-core` (minor), `kata-react` (minor)
- [x] `bun run release` — published `@kata-framework/core@0.9.0`, `@kata-framework/react@0.9.0`

---

## Phase 9 — Developer Experience `v0.10.0`

The tooling an active developer community needs — an in-browser devtools panel, behavioral test utilities, and performance profiling.

---

### 9.1 Frontend Dev Toolbar (Astro-style)

**What:** A standalone package (`@kata-framework/devtools`) that provides an in-browser debug overlay — a floating toolbar that attaches to any kata-powered app during development, providing deep runtime introspection without requiring code changes.

**Features:**

- **Scene Inspector** — live view of current scene, action index, frame data, ctx variables
- **Scene Graph Visualizer** — interactive graph showing current position, visited/unvisited nodes
- **Plugin Monitor** — real-time view of registered plugins, hook invocations, timing data
- **Timeline** — action-by-action playback history with scrubbing (undo/redo visualization)
- **Locale Preview** — toggle between registered locales, see overrides in real-time
- **Performance Profiler** — hook execution time, frame emission latency, plugin overhead
- **Frame Explorer** — inspect any emitted frame's full structure (action, state, meta, a11y hints)
- **Console** — execute expressions against ctx, inspect/modify variables live
- **Multiplayer Inspector** — player roster, authority status, sync event log, choice policy state
- **Asset Status** — preload queue, loaded/pending assets, cache state

**TDD test plan:**
1. `devtools-attach.test.ts`
   - `devtoolsPlugin()` attaches to engine and begins recording events
   - Removing the plugin stops recording
   - No events are recorded when `NODE_ENV=production`
2. `devtools-inspector.test.ts`
   - Scene inspector shows current scene ID, action index, and ctx
   - Timeline shows all past frames in order
   - Clicking a timeline entry details that frame
3. `devtools-profiler.test.ts`
   - Records execution time for each plugin hook invocation
   - Reports average/min/max frame emission latency
   - Identifies the slowest plugin

**Implementation:**
- New package: `packages/kata-devtools/`
- Published as `@kata-framework/devtools`
- Ships as a plugin (`devtoolsPlugin()`) + React component (`<KataDevtools />`)
- Uses `performance.now()` for timing
- Zero production overhead — tree-shaken via `"sideEffects": false` and `NODE_ENV` check
- CSS-in-JS for the overlay (no external CSS file needed)

---

### 9.2 Behavioral Test Helpers

**What:** Higher-level test utilities that test narrative *behavior* rather than frame-level implementation details.

**Why:** The current tests count exact frame indices and check action types. This is brittle — the condition-frame fix broke 9 tests. Behavioral helpers let you test "the player sees choice X after doing Y" without caring about frame indices.

**API surface:**

```ts
import { StoryTestRunner } from "@kata-framework/test-utils";

const story = new StoryTestRunner(scenes, initialCtx);

// Play through a story by describing what the player does
await story.start("intro");
await story.advanceUntilChoice();
expect(story.currentChoices).toContain("Enter the forest");
await story.choose("Enter the forest");
await story.advanceUntilText("Welcome to the forest");
expect(story.ctx.visited_forest).toBe(true);

// Assert reachability
expect(story.canReach("good-ending")).toBe(true);

// Assert at a narrative level
expect(story.dialogueLog).toContain("Welcome to the forest");
expect(story.speakerLog).toContain("Narrator");
```

**TDD test plan:**
1. `story-runner-basic.test.ts`
   - `advanceUntilChoice()` stops at the next choice action
   - `advanceUntilText(substring)` stops when text containing substring appears
   - `currentChoices` returns labels of available choices
   - `choose(label)` selects the choice with that label
2. `story-runner-assertions.test.ts`
   - `dialogueLog` contains all text spoken so far
   - `speakerLog` contains all speakers in order
   - `canReach(sceneId)` checks graph reachability
3. `story-runner-safety.test.ts`
   - `advanceUntilChoice()` on a scene with no choices throws after max steps
   - `choose("nonexistent")` throws with available choices in the error message

**Implementation:**
- New class in `packages/kata-test-utils/src/StoryTestRunner.ts`
- Wraps `KataEngine` with high-level methods
- Exported from `@kata-framework/test-utils`

---

### Phase 9 Release Checklist

- [ ] All new tests green
- [ ] Devtools overlay working in browser
- [ ] `StoryTestRunner` tested and documented
- [ ] Package READMEs updated (`kata-devtools`, `kata-test-utils`)
- [ ] Changesets created for affected packages
- [ ] `bun run release` — publish `@kata-framework/devtools@0.1.0`, `@kata-framework/test-utils` (minor)

---

## Phase 10 — Documentation Site `v1.0.0`

The framework is production-ready. Now make it learnable. A documentation site hosted on the user's existing web platform (`purukitto-web`) with getting-started guides, API references, and interactive examples.

---

### 10.1 Getting Started Guide

**What:** A step-by-step tutorial that takes a reader from zero to a running kata story in under 10 minutes.

**Sections:**

1. **Install** — `bun create kata-story my-game --template minimal` → running app
2. **Your First Scene** — anatomy of a `.kata` file, frontmatter, speakers, choices
3. **Variables & Logic** — `<script>` blocks, `${interpolation}`, `:::if` conditions, `[exec]`
4. **Adding Audio & Visuals** — backgrounds, tween animations, audio directives
5. **Save & Load** — snapshot API, `SaveManager` for React apps
6. **Publishing** — building with `kata build`, deploying to static hosting
7. **Next Steps** — links to plugin guide, multiplayer guide, API reference

**Format:** Markdown pages under a dedicated route on purukitto-web. Each section has copy-paste code examples and a "what you should see" screenshot.

---

### 10.2 API Reference

**What:** Auto-generated API documentation from TypeScript source types, covering every public export from every package.

**Packages documented:**

| Package | Key exports |
|---------|------------|
| `@kata-framework/core` | `KataEngine`, `parseKata`, `parseKataWithDiagnostics`, `KSONScene`, `KSONFrame`, `KSONAction`, `KSONMeta`, `Choice`, `KataPlugin`, `SnapshotManager`, `AudioManager`, `AssetRegistry`, `SceneGraph`, `LocaleManager`, `evaluate`, `interpolate` |
| `@kata-framework/react` | `KataProvider`, `useKata`, `useKataEngine`, `useKataMultiplayer`, `KataDebug`, `TypewriterText`, `SceneTransition`, `TweenTarget`, `useTween`, `SaveManager`, `useSaveSlots`, `KataErrorBoundary`, `useReducedMotion`, `useKeyboardNavigation`, `useFocusManagement` |
| `@kata-framework/sync` | `KataSyncManager`, `KataSyncTransport`, `BroadcastChannelTransport`, `WebSocketTransport`, `SyncEvent`, `ChoicePolicy`, `ConnectionState`, `PlayerInfo` |
| `@kata-framework/sync/server` | `KataServer`, `Room` |
| `@kata-framework/cli` | CLI commands: `build`, `watch`, `graph` |
| `@kata-framework/test-utils` | `createTestEngine`, `collectFrames`, `assertFrame`, `mockAudioManager`, `StoryTestRunner` |
| `@kata-framework/core/plugins/*` | Each plugin's factory function, config options, and API |

**Implementation:**
- Use TypeDoc or API Extractor to generate from `.d.ts` files
- Hosted as a section on purukitto-web
- Versioned — docs match the published npm version

---

### 10.3 Interactive Examples

**What:** Embeddable, runnable `.kata` examples on the documentation site — readers can edit scenes and see the result live in the browser.

**Approach:**

- Embed a minimal kata-react app in an iframe on each docs page
- Pre-loaded with the example scene from that page's tutorial
- Editable textarea for the `.kata` source — parses and re-renders on change
- Shows: rendered output, parsed KSON (collapsible), engine events log

**TDD test plan:**
1. `playground-parse.test.ts`
   - Editing the textarea re-parses the `.kata` source
   - Parse errors are displayed inline (not thrown)
   - Valid changes update the rendered output
2. `playground-isolation.test.ts`
   - Each playground instance has its own engine (no cross-contamination)
   - Resetting the playground restores the original source

**Implementation:**
- A small React app (`docs-playground/`) that wraps the parser and renderer
- Deployed alongside the documentation site
- Uses `@kata-framework/core` and `@kata-framework/react` from CDN or bundled

---

### 10.4 Multiplayer Guide

**What:** A dedicated guide for setting up multiplayer experiences — from same-device co-op to networked rooms.

**Sections:**

1. **Co-op in Two Tabs** — `BroadcastChannelTransport`, zero infrastructure
2. **Networked Rooms** — `KataServer`, `WebSocketTransport`, deployment
3. **Choice Policies** — first-writer, designated, vote — when to use each
4. **State Partitioning** — shared vs branching mode, sync points
5. **Player Presence** — lobby UI, spectator mode
6. **Authority Migration** — what happens when the host disconnects
7. **Troubleshooting** — common issues (CORS, reconnection, state divergence)

---

### Phase 10 Release Checklist

- [ ] Getting Started guide published on purukitto-web
- [ ] API reference generated and published
- [ ] Interactive playground deployed
- [ ] Multiplayer guide published
- [ ] Plugin authoring guide migrated to docs site
- [ ] Root README links to docs site
- [ ] Version `1.0.0` — stable API surface commitment
- [ ] Changesets for all packages (major version bump)
- [ ] `bun run release` — publish all packages at `1.0.0`

---

## Phase 11 — Web-Based Editor `v1.1.0`

Authors shouldn't need VS Code. A browser-based `.kata` editor lowers the barrier from "install an IDE and extensions" to "open a URL."

---

### 11.1 Monaco Editor Integration

**What:** A web-based `.kata` file editor using Monaco Editor (the engine behind VS Code) with syntax highlighting, autocompletion, and inline diagnostics.

**Features:**

- `.kata` syntax highlighting (reuse grammar from `kata-vscode`)
- Inline diagnostics — red squiggles on errors, yellow on warnings (powered by `parseKataWithDiagnostics`)
- Autocomplete — scene IDs, variable names, directive syntax
- Multi-file support — tabs for each `.kata` scene file
- Minimap and find/replace

**TDD test plan:**
1. `editor-syntax.test.ts`
   - `.kata` files get syntax highlighting (frontmatter, speakers, directives)
   - `<script>` blocks get JavaScript highlighting
2. `editor-diagnostics.test.ts`
   - Invalid `cond` expression shows inline error
   - Missing scene target shows warning
   - Diagnostics update on edit
3. `editor-autocomplete.test.ts`
   - `-> @` triggers scene ID completion
   - `${` triggers variable name completion
   - `[` triggers directive completion (`wait`, `exec`, `bg`, `audio`, `tween`)

**Implementation:**
- New package: `packages/kata-editor/` — published as `@kata-framework/editor`
- Uses `monaco-editor` for the editor component
- Reuses `kata-lsp` diagnostic and completion logic (adapted for browser — no LSP protocol, direct function calls)
- TextMate grammar from `kata-vscode` converted to Monaco Monarch syntax

---

### 11.2 Live Preview Panel

**What:** A split-pane view — editor on the left, live preview on the right. Changes to `.kata` source are parsed and rendered in real-time.

**Features:**

- Real-time preview — re-parses and re-renders on every keystroke (debounced 300ms)
- Interactive — can click "Next" and make choices in the preview
- Scene selector — dropdown to jump to any scene in the project
- Context inspector — collapsible panel showing current `ctx` variables
- Frame inspector — shows the raw KSON frame for the current action

**TDD test plan:**
1. `preview-parse.test.ts`
   - Editing source re-parses and shows updated dialogue
   - Parse errors show an error overlay in the preview (not a crash)
2. `preview-interact.test.ts`
   - Clicking "Next" in preview advances the engine
   - Making a choice in preview selects and advances
   - Preview engine is isolated (editing source resets it)
3. `preview-inspector.test.ts`
   - Context panel shows current `ctx` values
   - Values update after exec blocks and choices
   - Frame panel shows raw KSON for current action

**Implementation:**
- Split-pane layout using CSS grid
- Preview uses `@kata-framework/react` components
- Context and frame inspectors are collapsible panels with JSON tree views
- Debounced re-parse on source change (300ms)

---

### 11.3 Project Management

**What:** Multi-file project support — create, rename, delete `.kata` scenes, manage locale files, configure assets, and export projects.

**Features:**

- **File tree sidebar** — shows all `.kata` files, locale files, and assets
- **Create new scene** — template picker (blank, dialogue, choice-heavy, hub)
- **Scene graph view** — interactive graph (reuse `SceneGraph` from `kata-core`)
- **Export** — download project as a `.zip` file
- **Import** — upload a `.zip` to load a project
- **Local storage** — projects persist in browser storage (IndexedDB)
- **Share** — generate a shareable URL with the project encoded (for small projects)

**TDD test plan:**
1. `project-crud.test.ts`
   - Creating a scene adds it to the file tree and opens it in editor
   - Renaming a scene updates references in other scenes' `-> @` targets
   - Deleting a scene removes it and shows warnings in referencing scenes
2. `project-persistence.test.ts`
   - Project persists in IndexedDB across page reloads
   - Export produces a valid `.zip` with all files
   - Import from `.zip` restores all files
3. `project-graph.test.ts`
   - Scene graph updates when scenes are added/removed/edited
   - Clicking a node in the graph opens the scene in the editor
   - Dead ends and orphans are highlighted

**Implementation:**
- IndexedDB for project storage (via `idb` wrapper library)
- `JSZip` for export/import
- Scene graph visualization reuses `SceneGraph.toJSON()` with a canvas or SVG renderer
- Share URLs use `lz-string` compression for encoding small projects in the URL hash

---

### Phase 11 Release Checklist

- [ ] All new tests green
- [ ] Editor works in browser with syntax highlighting, diagnostics, and autocomplete
- [ ] Live preview updates on source change
- [ ] Project management: create/rename/delete scenes, export/import `.zip`
- [ ] Scene graph visualization in editor
- [ ] Published as `@kata-framework/editor`
- [ ] Hosted on docs site as "/editor" or "/playground"
- [ ] Package README with screenshots and usage guide
- [ ] Changesets created for `kata-editor` (initial)
- [ ] `bun run release` — publish `@kata-framework/editor@0.1.0`

---

## Phase 12 — Showcase Story `v1.2.0`

Everything is built. Now prove it works together. This phase produces a polished, playable 5-minute narrative experience — "The Last Broadcast" — that exercises every major feature of the framework. It is both the demo that sells the project and the living integration test that keeps it honest. Built with the web editor, tested with `StoryTestRunner`, rendered with typewriter text and tween animations, backed by real audio, wrapped in error boundaries, translated into Japanese, and playable in co-op.

---

### 12.1 Story Design & Scene Structure

**What:** A complete narrative arc with 8-12 scenes, branching paths, 3 endings, and meaningful choices that affect outcome. Written in `.kata` files using every syntax feature the engine supports.

**Why:** The existing tech demo has skeleton scenes with placeholder dialogue. A real story with stakes, character voice, and emotional beats proves the format works for authors, not just engineers. This is what evaluators will *play*.

**Deliverables:**

- **Story bible** (`examples/showcase/STORY.md`) — character bios, world-building notes, scene map
- **8-12 `.kata` scenes** covering the full arc:
  - Prologue (cold open, establish stakes)
  - 2-3 hub scenes (player-driven exploration, variable accumulation)
  - 3-4 branching scenes (consequence of earlier choices)
  - 3 endings (good / neutral / bad, determined by accumulated `ctx` state)
- **Full syntax coverage** — uses `:::if`/`:::elseif`/`:::else`, `[exec]` blocks, `${interpolation}`, `[wait]`, `[tween]`, `[tween-group]`, `[audio play/stop/volume]`, `// comments`, and `<script>` blocks
- **Content warnings** — tagged scenes that trigger the content-warnings plugin
- **Scene graph validation** — `kata graph --lint` returns zero warnings (no orphans, no dead ends)

**TDD test plan (uses `StoryTestRunner` from Phase 9):**
1. `story-structure.test.ts`
   - All scenes parse without errors (`parseKataWithDiagnostics` returns zero diagnostics per scene)
   - Scene graph has no orphaned scenes
   - Scene graph has no dead ends (every terminal scene emits `"end"`)
   - All three endings are reachable from the prologue
2. `story-playthrough.test.ts`
   - Automated playthrough of the "good ending" path using `StoryTestRunner.advanceUntilChoice()` / `.choose()`
   - Automated playthrough of the "bad ending" path
   - Variable interpolation resolves correctly at each narrative point
   - Conditional branches fire based on accumulated `ctx` values
3. `story-consistency.test.ts`
   - No undefined variables referenced in any scene
   - All choice targets (`-> @scene/id`) resolve to registered scenes
   - Profanity filter applies correctly to tagged dialogue

---

### 12.2 Visual & Audio Polish

**What:** Background art (AI-generated or CC0), ambient audio, sound effects, and scene transitions — all loaded through the `AssetPipeline` (Phase 6) and played via `WebAudioManager` (Phase 6).

**Deliverables:**

- **8-12 background images** (one per scene, stored in `examples/showcase/assets/`)
- **Ambient audio tracks** (2-3 looping BGM files, CC0/royalty-free, referenced via `[audio play bgm "..."]`)
- **Sound effects** (UI click, choice confirm, dramatic reveal — 4-6 sfx files, referenced via `[audio play sfx "..."]`)
- **Tween sequences** in `.kata` files — character fade-in, background pan, UI slide
- **Asset pipeline integration** — all assets preloaded via `AssetPipeline` with progress bar on scene load
- **Asset manifest** in scene frontmatter — all assets referenced via `meta.assets` and preloadable via `AssetRegistry`

**TDD test plan:**
1. `assets-integrity.test.ts`
   - Every asset referenced in scene frontmatter exists on disk
   - `AssetRegistry` registers all scene assets without errors
   - `SceneGraph.getPreloadSet()` returns correct assets for each scene path
2. `audio-integration.test.ts`
   - Audio actions in scenes produce correct `AudioCommand` events
   - BGM plays on scene entry, stops on scene exit
   - SFX fires on specific actions (choice made, dramatic beat)
3. `tween-sequences.test.ts`
   - Tween actions in scenes produce correct tween frames
   - Tween-groups with `parallel` mode emit all tweens in one frame
   - Auto-advance works correctly after tween sequences

---

### 12.3 React UI & Presentation Layer

**What:** A polished React frontend in `examples/showcase/` built with the production React components from Phase 7 — `TypewriterText`, `SceneTransition`, `TweenTarget`, `SaveManager` — wrapped in `KataErrorBoundary` from Phase 8.

**Deliverables:**

- **Typewriter dialogue** — uses `<TypewriterText>` for character-by-character text reveal
- **Scene transitions** — uses `<SceneTransition transition="fade">` between scenes
- **Tween rendering** — uses `<TweenTarget>` and `useTween()` for character portraits and UI animations
- **Save/load UI** — uses `SaveManager` with `useSaveSlots()` — 3 manual slots + auto-save indicator
- **Error boundary** — `<KataErrorBoundary>` wraps the entire app with recovery options
- **Choice presentation** — animated choice panels with hover states, keyboard navigation (arrow keys + Enter), a11y attributes
- **Responsive layout** — works on desktop and mobile viewports
- **Start screen** — title, tagline, "New Story" / "Continue" / "Load" buttons
- **End screen** — per-ending art and text, "Play Again" button
- **Devtools integration** — `<KataDevtools />` (Phase 9) available in dev mode

**TDD test plan:**
1. `typewriter.test.ts`
   - Text appears progressively over the configured duration
   - Clicking during animation completes the text immediately
   - Completed text shows the "Continue" button
2. `transitions.test.ts`
   - Scene change triggers a CSS transition class
   - Background image updates after transition completes
   - `prefers-reduced-motion` skips the transition
3. `audio-playback.test.ts`
   - BGM starts on scene entry and loops
   - Scene change crossfades BGM tracks
   - SFX plays on trigger and does not interrupt BGM
   - Volume controls work
4. `save-load-ui.test.ts`
   - Saving to a slot writes to `localStorage`
   - Loading from a slot restores engine state and re-renders the correct scene
   - Auto-save indicator updates on scene changes
   - Empty slots show "Empty" and are disabled for loading

---

### 12.4 Multiplayer Co-op Demo Mode

**What:** A "Co-op Broadcast" option on the start screen that lets two players (same device, two tabs) experience the story together using `BroadcastChannel` transport.

**Why:** Multiplayer is the framework's biggest differentiator. If the showcase doesn't demonstrate it, evaluators won't believe it works. Two-tab co-op is the lowest-friction demo possible — no server setup required.

**Deliverables:**

- **Lobby screen** — shows connected players, authority status, "Start Story" button (authority only)
- **Player presence bar** — persistent UI showing who's connected and their role
- **Choice policy selector** — toggle between "First Click Wins", "Host Decides", and "Vote" during gameplay
- **Vote UI** — when vote policy is active, shows each player's vote and a countdown timer
- **Late-join sync** — opening a new tab mid-story catches up via snapshot
- **Authority migration** — closing the authority tab transfers authority to the remaining tab seamlessly

**TDD test plan:**
1. `coop-lobby.test.ts`
   - Two `KataSyncManager` instances connect via `BroadcastChannelTransport`
   - First connection becomes authority
   - Both players appear in presence roster
2. `coop-playthrough.test.ts`
   - Authority starts the story, follower receives the first frame
   - Follower's next() sends intent, authority processes, both advance
   - Choice made by authority is reflected on follower
3. `coop-policies.test.ts`
   - Switching to "vote" policy shows vote UI to both players
   - Both players vote, majority wins, story advances with winning choice
   - "Designated" policy only accepts choices from the designated player
4. `coop-resilience.test.ts`
   - Authority disconnect triggers authority migration
   - New authority can continue the story
   - Late-joining tab receives current state

---

### 12.5 Localization Demo

**What:** Full Japanese translation of the showcase story, demonstrable via an in-game locale switcher.

**Why:** i18n support exists in the engine but has never been demonstrated end-to-end. A real translation proves the locale system works with variable interpolation, speaker name overrides, and mid-scene switching.

**Deliverables:**

- **Japanese locale files** (`examples/showcase/locales/ja/*.yaml`) — all scenes translated
- **Locale switcher UI** — dropdown or button in the toolbar, instant text swap on change
- **Fallback verification** — any untranslated keys fall back to English gracefully
- **Snapshot locale persistence** — saving in Japanese and loading restores Japanese

**TDD test plan:**
1. `locale-showcase.test.ts`
   - Every scene has a corresponding Japanese locale file
   - All locale files parse without errors
   - Setting locale to `"ja"` produces Japanese text in frames
   - Variable interpolation (`${listeners}`) works in Japanese strings
2. `locale-switcher.test.ts`
   - Switching locale mid-scene re-emits the current frame with translated text
   - Switching back to `"en"` restores English text
3. `locale-snapshot.test.ts`
   - Saving a snapshot in `"ja"` locale and loading it restores `"ja"`

---

### Phase 12 Release Checklist

- [ ] All new tests green
- [ ] Showcase playable at `http://localhost:3000` via `cd examples/showcase && bun run dev`
- [ ] Uses every framework feature: typewriter, transitions, tweens, audio, save/load, error boundary, devtools, localization, multiplayer
- [ ] `kata graph examples/showcase/scenes/**/*.kata --lint` returns zero warnings
- [ ] Three complete endings reachable by automated test (using `StoryTestRunner`)
- [ ] Co-op mode works across two browser tabs
- [ ] Japanese locale fully functional
- [ ] Root README updated with "Try the Showcase" section linking to the example
- [ ] Changesets created for affected packages
- [ ] `bun run release` — publish updated packages

---

## Summary

| Phase | Version | Status | Key Deliverables |
|-------|---------|--------|------------------|
| **1 — Extensibility** | `0.2.0` | Done | Plugin system, test utils, undo/rewind, error diagnostics |
| **2 — Authoring** | `0.3.0` | Done | LSP, scene graph, syntax extensions |
| **3 — Reach** | `0.4.0` | Done | i18n, analytics, a11y, tweens |
| **4 — Plugin Ecosystem** | `0.5.0` | Done | Subpath exports, 5 official plugins, scaffolder |
| **5 — Multiplayer** | `0.6.0` | Done | Sync protocol, transports, server, choice policies, state partitioning |
| **6 — Audio & Assets** | `0.7.0` | Done | Web Audio Manager, asset pipeline, `.kata` audio syntax |
| **7 — Production React** | `0.8.0` | Done | Typewriter, transitions, tween renderer, save slots |
| **8 — Resilience** | `0.9.0` | | Error recovery, eval hardening, React error boundary |
| **9 — DevEx** | `0.10.0` | | Devtools overlay, behavioral test helpers |
| **10 — Documentation** | `1.0.0` | | Docs on purukitto-web, API ref, interactive playground, multiplayer guide |
| **11 — Web Editor** | `1.1.0` | | Monaco-based `.kata` editor, live preview, project management |
| **12 — Showcase Story** | `1.2.0` | | Polished 5-min story using every feature, co-op demo, Japanese locale |

Each phase ships with: passing TDD test suite, updated README (guide-style with examples), changesets, and published packages.
