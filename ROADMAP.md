# Kata Framework — Roadmap

> **Every feature on this roadmap follows Test-Driven Development.**
> Write failing tests first. Implement until green. Refactor. No feature ships without coverage.
>
> Each phase is a versioned release. At the end of every phase:
> 1. All new tests pass (`bun test`)
> 2. Root README is updated with guide-like documentation for every new user-facing feature
> 3. **Package READMEs updated** (`packages/*/README.md`) — these are displayed on the npm package page
> 4. Changeset is created and packages are published
> 5. **This roadmap is updated** — check off completed items, update current version

Current version: `0.5.0` — Parser, runtime, store, audio, save/load, modding (VFS + scene merge), asset preloading, React bindings, CLI, VS Code syntax highlighting, plugin system, undo/rewind, error diagnostics, test utilities, LSP (diagnostics, autocomplete, hover, go-to-def, symbols), scene graph visualization (CLI + VS Code), syntax extensions (`[wait]`, `[exec]`, `:::else`/`:::elseif`, comments), localization (i18n), branching analytics plugin, accessibility (a11y hints + React ARIA/keyboard hooks), animation/tween timelines, **plugin ecosystem (subpath exports, profanity filter, auto-save, debug logger, content warnings, validation utility, plugin scaffolder, authoring guide)**.

---

## Phase 1 — Engine Extensibility `v0.2.0` ✅ COMPLETE

The engine works, but it's closed. This phase opens it up to plugin authors, improves the developer feedback loop, and adds player-comfort features.

> **Completed 2026-03-21.** All 4 features shipped, 114 tests pass, all packages build.

---

### 1.1 Plugin / Middleware System

**What:** A lifecycle hook system that lets developers extend the engine without forking it.

**Why:** Game authors need analytics, content filtering, logging, mod integration, and custom logic at decision points. The engine currently offers only post-hoc events (`"update"`, `"end"`). Plugins add *before* and *after* hooks that can inspect and transform actions.

**API surface:**

```ts
import { KataEngine } from "@kata-framework/core";

const engine = new KataEngine();

engine.use({
  name: "profanity-filter",
  beforeAction(action, ctx) {
    // Mutate action before it reaches the UI
    if (action.type === "text") {
      action.content = censor(action.content);
    }
    return action; // return null to skip the action entirely
  },
  afterAction(action, ctx) { /* logging, analytics */ },
  onChoice(choice, ctx) { /* record player decisions */ },
  beforeSceneChange(fromId, toId, ctx) { /* guard transitions */ },
});

engine.getPlugins();          // ["profanity-filter"]
engine.removePlugin("profanity-filter");
```

**TDD test plan:**
1. `plugin-lifecycle.test.ts`
   - `beforeAction` is called before `"update"` event fires
   - `afterAction` is called after `"update"` event fires
   - `onChoice` is called when `makeChoice()` is invoked
   - `beforeSceneChange` is called on scene transitions
   - Hooks run in registration order
   - Returning `null` from `beforeAction` skips the action
   - Mutating the action in `beforeAction` changes what the UI receives
2. `plugin-management.test.ts`
   - `getPlugins()` returns names in registration order
   - `removePlugin()` stops hook execution
   - Duplicate plugin names throw
   - Registering after `start()` still works

**Implementation:**
- Add a `PluginManager` internal class to `KataEngine`
- `KataPlugin` interface exported from `kata-core`
- Dispatch hooks at existing control points in `next()`, `makeChoice()`, `start()`
- No new dependencies

---

### 1.2 `@kata-framework/test-utils` (new package)

**What:** First-class testing helpers for game authors and framework contributors.

**Why:** Every test file in `kata-core` repeats the same boilerplate: parse a scene string, create an engine, register scenes, collect frames via event listeners. As we add plugin tests, multiplayer tests, and encourage game authors to test their own `.kata` scenes, this boilerplate compounds. A small utilities package pays for itself immediately and makes TDD frictionless for every subsequent phase.

**API surface:**

```ts
import { createTestEngine, collectFrames, assertFrame, mockAudioManager } from "@kata-framework/test-utils";

// One-liner engine setup from raw .kata strings
const { engine, frames } = createTestEngine(`
  ---
  id: test
  title: Test Scene
  ---
  :: Narrator :: Hello world
`, { player: { gold: 100 } });

engine.start("test");

// Run a full scene, get all frames
const allFrames = collectFrames(engine, "test");

// Readable assertion helper
assertFrame(allFrames[0], {
  type: "text",
  speaker: "Narrator",
  content: "Hello world",
});

// Records audio commands for assertions
const audio = mockAudioManager();
engine.on("audio", audio.handler);
expect(audio.commands).toEqual([{ action: "play", id: "bgm" }]);
```

**TDD test plan:**
1. `createTestEngine.test.ts`
   - Accepts a single `.kata` string or an array
   - Registers all scenes automatically
   - Applies initial context
   - Returns `{ engine, frames }` where `frames` is a live array
2. `collectFrames.test.ts`
   - Starts the scene and advances to the end
   - Returns all emitted frames in order
   - Handles scenes with choices (stops at first choice by default, option to auto-pick)
3. `assertFrame.test.ts`
   - Partial matching (only checks provided fields)
   - Clear error messages on mismatch
4. `mockAudioManager.test.ts`
   - Records all commands in order
   - Provides `reset()` and `lastCommand` helpers

**Implementation:**
- New `packages/kata-test-utils/` with `workspace:*` dep on `kata-core`
- Published as `@kata-framework/test-utils`
- Zero external dependencies beyond `kata-core`

---

### 1.3 Undo / Rewind

**What:** Step backward through the narrative, restoring previous `ctx` state.

**Why:** Essential for two audiences. Developers: rewind while debugging scenes without restarting. Players: "I didn't mean to pick that" is the most common narrative game complaint.

**API surface:**

```ts
engine.start("intro");
engine.next();  // action 0 → 1
engine.next();  // action 1 → 2
engine.back();  // action 2 → 1, ctx restored to state at action 1

// Configure depth
const engine = new KataEngine(ctx, { historyDepth: 100 }); // default: 50
```

**TDD test plan:**
1. `rewind-basic.test.ts`
   - `back()` restores the previous `KSONFrame`
   - `back()` restores `ctx` to its state before the last action
   - `back()` at the start of a scene is a no-op
   - `back()` emits a standard `"update"` event (UI doesn't need special handling)
2. `rewind-state.test.ts`
   - `ctx` mutations from `<script>` blocks and `exec` actions are reversed
   - `ctx` mutations from choice `action` fields are reversed
   - Rewinding past a scene transition returns to the previous scene
3. `rewind-limits.test.ts`
   - History respects `historyDepth` (oldest entries are dropped)
   - Default depth is 50
4. `rewind-snapshot.test.ts`
   - Snapshots include rewind history
   - Loading a snapshot restores rewind capability

**Implementation:**
- Push `structuredClone(state)` onto a stack before each action
- `back()` pops the stack and restores via `store.getState().restoreState()`
- Stack lives in the engine, not the store (avoids Zustand middleware complexity)
- Capped at `historyDepth` entries

---

### 1.4 Error Reporting & Diagnostics

**What:** Structured, actionable error messages when `.kata` files or runtime expressions fail.

**Why:** Currently, a bad `${expr}` or invalid `cond="..."` throws a raw `new Function` error with no source location. Authors need to know *which scene*, *which action*, and *which line* broke.

**API surface:**

```ts
// Parser diagnostics
const result = parseKata(source); // existing API, now also returns warnings
// New: parseKataWithDiagnostics(source) for detailed mode

import { parseKataWithDiagnostics } from "@kata-framework/core";
const { scene, diagnostics } = parseKataWithDiagnostics(source);
// diagnostics: [{ level: "warning", message: "...", line: 12, sceneId: "intro" }]

// Runtime error event
engine.on("error", (diagnostic) => {
  // { level: "error", message: "...", sceneId: "intro", actionIndex: 3 }
});
```

**TDD test plan:**
1. `diagnostics-parser.test.ts`
   - Missing `id` in frontmatter produces a warning
   - Invalid `cond` expression syntax produces an error with line number
   - Broken `${expr}` interpolation includes the expression text in the message
   - Unreferenced asset in `meta.assets` produces a warning
2. `diagnostics-runtime.test.ts`
   - Failed `evaluate()` emits `"error"` event with scene ID and action index
   - Failed `interpolate()` emits `"error"` event and falls back to raw text
   - Engine continues after non-fatal errors (doesn't crash)
3. `diagnostics-format.test.ts`
   - All diagnostics have `level`, `message`, `sceneId`
   - Parser diagnostics include `line` number
   - Runtime diagnostics include `actionIndex`

**Implementation:**
- `Diagnostic` type exported from `kata-core`
- `parseKataWithDiagnostics()` wraps `parseKata()` with try/catch and validation
- `evaluate()` and `interpolate()` catch errors and emit via engine
- `parseKata()` remains unchanged (backward compatible)

---

### Phase 1 Release Checklist

- [x] All new tests green (114 tests across 25 files)
- [x] README updated:
  - [x] Plugin system section with usage example
  - [x] Undo/rewind section with `engine.back()` example
  - [x] Error event added to Engine Events table
  - [x] `@kata-framework/test-utils` mentioned in Packages table
  - [x] Error diagnostics section with `parseKataWithDiagnostics()` example
  - [x] Test utilities section with API examples
- [x] Plugin guide created at `docs/plugins.md`
- [x] CLAUDE.md updated with new modules and test-utils package
- [x] Changesets created for `kata-core` (minor) and `kata-test-utils` (initial)
- [x] `bun run release` — publish `@kata-framework/core@0.2.0`, `@kata-framework/test-utils@0.1.0`

---

## Phase 2 — Content Authoring `v0.3.0` ✅ COMPLETE

The engine is extensible. Now make writing `.kata` files a joy — better tooling, richer syntax, visual feedback on story structure.

> **Completed 2026-03-21.** All 3 features shipped, 150 tests pass, all packages build.

---

### 2.1 Kata Language Server (LSP)

**What:** A Language Server Protocol implementation for `.kata` files, integrated into the existing `kata-vscode` extension.

**Why:** Syntax highlighting exists but authors currently get no feedback until runtime. An LSP catches errors at write-time: undefined variables, broken scene links, typos in expressions.

**Capabilities (prioritized):**

| Feature | Description |
|---------|-------------|
| **Diagnostics** | Undefined variables in `${...}`, unreachable `-> @scene/id` targets, duplicate scene IDs, syntax errors in `cond="..."` |
| **Autocomplete** | Scene IDs after `-> @`, variable names in `${...}` and `cond="..."`, asset IDs in `[bg src="..."]` |
| **Hover** | Show resolved value type for `${path}`, show asset URL for `[bg src="..."]` |
| **Go-to-definition** | Jump from `-> @scene/id` to the target `.kata` file |
| **Document symbols** | Outline view: scenes, speakers, choice branches |

**Package:** New `packages/kata-lsp/` — published as `@kata-framework/lsp`. The `kata-vscode` extension gains a dependency on it and launches it as a language server.

**TDD test plan:**
1. `diagnostics.test.ts`
   - Reports undefined variable in `${undeclaredVar}`
   - Reports unresolved scene target `-> @nonexistent/scene`
   - Reports duplicate scene IDs across a workspace
   - Reports syntax error in `cond="if =="` (invalid expression)
   - No false positives on valid `.kata` files
2. `completions.test.ts`
   - Completes scene IDs from workspace after `-> @`
   - Completes variable names from `<script>` context in `${...}`
   - Completes asset keys from frontmatter in `[bg src="..."]`
3. `hover.test.ts`
   - Shows variable path and inferred type on `${player.gold}` hover
   - Shows asset URL on `[bg src="forest.jpg"]` hover
4. `goto-definition.test.ts`
   - Navigates from `-> @forest/deep` to the file containing `id: forest/deep`
5. `symbols.test.ts`
   - Returns scene ID, speaker names, and choice labels as document symbols

**Implementation:**
- Use `vscode-languageserver` and `vscode-languageclient` packages
- Reuse `parseKata()` and `parseKataWithDiagnostics()` from `kata-core` for analysis
- Build a workspace index: scan all `.kata` files for scene IDs, variables, assets
- Update `kata-vscode` to launch the LSP as a child process

---

### 2.2 Scene Graph Visualization

**What:** Visualize how scenes connect through choices — as a CLI output and as an interactive VS Code webview.

**Why:** Complex narratives with 50+ scenes become hard to reason about. Authors need to see orphaned scenes, dead ends, and the overall shape of their story at a glance.

**Two delivery modes:**

**CLI (`kata-cli`):**
```bash
# Output DOT format (pipe to Graphviz or online renderers)
kata graph "scenes/**/*.kata" --format dot > story.dot

# Output JSON (nodes + edges, for custom tooling)
kata graph "scenes/**/*.kata" --format json

# Show problems
kata graph "scenes/**/*.kata" --lint
# ⚠ Orphaned scene: "secret-ending" (no inbound edges)
# ⚠ Dead end: "bad-ending" (no choices, no outbound edges)
```

**VS Code extension (`kata-vscode`):**
- New command: `Kata: Show Scene Graph`
- Opens a webview panel with an interactive graph (d3-force or elkjs)
- Click a node to open the `.kata` file
- Color-coding: green (reachable from start), yellow (orphaned), red (dead end)
- Updates live as `.kata` files are saved

**TDD test plan:**
1. `graph-cli.test.ts`
   - DOT output contains correct nodes and edges for a known scene set
   - JSON output matches expected `{ nodes: [...], edges: [...] }` shape
   - `--lint` detects orphaned scenes (no inbound edges except start)
   - `--lint` detects dead-end scenes (no outbound edges, no `"end"` marker)
   - Handles cycles without infinite output
2. `graph-analysis.test.ts` (shared logic in `kata-core`)
   - `SceneGraph.getOrphans(startId)` returns scenes with no path from start
   - `SceneGraph.getDeadEnds()` returns scenes with no outbound edges
   - `SceneGraph.toJSON()` returns serializable representation
   - `SceneGraph.toDOT()` returns valid DOT syntax
3. `graph-vscode.test.ts`
   - Webview receives correct graph data on activation
   - Graph updates when `.kata` file is saved

**Implementation:**
- Extend `SceneGraph` in `kata-core` with `getOrphans()`, `getDeadEnds()`, `toJSON()`, `toDOT()`
- Add `kata graph` command to `kata-cli`
- Add webview panel to `kata-vscode` (HTML + bundled JS, no framework needed)

---

### 2.3 `.kata` Syntax Extensions

**What:** New directives that map to existing KSON action types which currently have no `.kata` syntax.

**Why:** `wait` and `exec` action types exist in the engine but can only be used by building KSON programmatically. Authors should be able to use them inline. Conditional blocks also lack `else` branches, forcing authors to write two `:::if` blocks with opposite conditions.

**New syntax:**

```kata
:: Narrator :: The door creaks open...

[wait 2000]

[exec]
ctx.doorOpened = true;
ctx.suspicion += 10;
[/exec]

:::if{cond="suspicion > 50"}
:: Guard :: Who goes there?!
:::elseif{cond="suspicion > 20"}
:: Guard :: Hmm, did I hear something?
:::else
:: Narrator :: The guard doesn't notice you.
:::

// This is a comment — stripped during parsing
```

| New Syntax | Maps To |
|------------|---------|
| `[wait 2000]` | `{ type: "wait", duration: 2000 }` |
| `[exec] ... [/exec]` | `{ type: "exec", code: "..." }` |
| `:::elseif{cond="..."}` | Additional condition branch |
| `:::else` | Default branch (no condition) |
| `// comment` | Stripped — no KSON output |

**TDD test plan:**
1. `parse-wait.test.ts`
   - `[wait 2000]` parses to `{ type: "wait", duration: 2000 }`
   - `[wait 500]` handles different durations
   - `[wait]` without duration produces a diagnostic
2. `parse-exec.test.ts`
   - `[exec] ctx.x = 1 [/exec]` parses to `{ type: "exec", code: "ctx.x = 1" }`
   - Multiline code blocks preserve content
   - Unclosed `[exec]` produces a diagnostic
3. `parse-else.test.ts`
   - `:::if ... :::else ... :::` produces correct condition + fallback actions
   - `:::if ... :::elseif ... :::else ... :::` chains correctly
   - Multiple `:::elseif` branches work
   - `:::else` without preceding `:::if` produces a diagnostic
4. `parse-comments.test.ts`
   - `// comment` lines are stripped from output
   - `//` inside `:: Speaker :: text with // slashes` is NOT stripped
   - `//` inside `<script>` blocks are NOT stripped (handled by JS semantics)

**Implementation:**
- Add remark-directive handlers for `wait` and `exec` in the parser
- Extend the `:::if` handler to track `elseif`/`else` siblings
- Add a preprocessing step to strip `//` comment lines before markdown parsing

---

### Phase 2 Release Checklist

- [x] All new tests green (150 tests across 36 files)
- [x] Root README updated:
  - [x] New syntax directives added to Narrative Body table (`[wait]`, `[exec]`, `:::else`, `:::elseif`, `// comments`)
  - [x] LSP section: diagnostics, autocomplete, hover, go-to-def, symbols
  - [x] Scene graph CLI command documented in CLI Usage
  - [x] `@kata-framework/lsp` and `kata-vscode` updates in Packages table
- [x] Package READMEs updated (`kata-core`, `kata-react`, `kata-cli`, `kata-test-utils`, `kata-lsp`)
- [x] Changesets created for `kata-core` (minor), `kata-lsp` (initial)
- [x] `bun run release` — published `@kata-framework/core@0.3.0`, `@kata-framework/lsp@0.2.0`, `@kata-framework/react@0.1.2`, `@kata-framework/test-utils@0.2.1`

---

## Phase 3 — Reach & Intelligence `v0.4.0` ✅ COMPLETE

The authoring experience is solid. Now make narratives accessible to more audiences and give authors data to improve their stories.

> **Completed 2026-03-22.** All 4 features shipped, 218 tests pass, all packages build.

---

### 3.1 Localization (i18n)

**What:** Ship one scene in multiple languages. Text content swaps based on locale; logic, conditions, and structure remain unchanged.

**Why:** Narrative games have large international audiences. Without framework-level i18n, authors resort to duplicating entire scene files per language — fragile and unmaintainable.

**Design:**

Locale files sit alongside `.kata` files:

```
scenes/
  intro.kata              ← base language (e.g. English)
  intro.kata.ja.yml       ← Japanese overrides
  intro.kata.es.yml       ← Spanish overrides
```

Locale file format (keyed by action index or stable speaker+content hash):

```yaml
# intro.kata.ja.yml
locale: ja
overrides:
  - index: 0
    content: "森へようこそ、${player.name}。"
  - index: 2
    speaker: "商人"
    content: "おお、裕福な旅人！"
```

**API surface:**

```ts
engine.setLocale("ja");           // switch language
engine.setLocaleFallback("en");   // fallback if key missing

// Locale files loaded via VFS or direct registration
engine.registerLocale("intro", "ja", overrides);
```

**TDD test plan:**
1. `locale-resolution.test.ts`
   - Setting locale replaces text content in emitted frames
   - Missing locale key falls back to base language
   - Missing locale file entirely falls back to base language
   - Speaker names can be overridden per locale
2. `locale-interpolation.test.ts`
   - `${player.name}` still interpolates correctly in localized text
   - Conditions (`cond="..."`) are NOT localized (logic is language-independent)
3. `locale-switching.test.ts`
   - `setLocale()` mid-scene affects subsequent frames
   - `setLocale()` does NOT re-emit already-passed frames
4. `locale-snapshot.test.ts`
   - Current locale is included in snapshots
   - Loading a snapshot restores the locale setting
5. `locale-vfs.test.ts`
   - Locale files can be loaded from VFS layers (mods can add translations)

**Implementation:**
- `LocaleManager` class in `kata-core` — stores overrides per scene per locale
- `interpolate()` resolves text from locale overrides before variable substitution
- CLI: `kata build` gains `--locales` flag to bundle locale files into KSON output
- VFS integration: locale files are resolved through layers like any other file

---

### 3.2 Branching Analytics (Plugin)

**What:** A built-in plugin (using the Phase 1 plugin system) that tracks how players experience the story.

**Why:** Authors need data. Which choices are most popular? Where do players drop off? Which scenes are never reached? This plugin answers those questions without external dependencies.

**API surface:**

```ts
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";

engine.use(analyticsPlugin());

// After gameplay
const report = engine.getPlugin("analytics").getReport();
// {
//   sceneVisits: { "intro": 3, "shop": 1 },
//   choiceSelections: { "buy-sword": 2, "continue": 1 },
//   dropOffPoints: ["bad-ending"],
//   averageActionsPerScene: { "intro": 4.5 },
//   sessionDuration: 45000,
// }

// Export for external tools
const json = engine.getPlugin("analytics").toJSON();
```

**TDD test plan:**
1. `analytics-tracking.test.ts`
   - Records scene visit counts
   - Records choice selection counts
   - Records actions-per-scene averages
   - Tracks session duration (start to end or snapshot)
2. `analytics-insights.test.ts`
   - Identifies drop-off points (scenes where `"end"` fires without outbound choices)
   - Identifies most/least popular choices
   - Handles replays (same scene visited multiple times)
3. `analytics-export.test.ts`
   - `toJSON()` returns a plain serializable object
   - `reset()` clears all data
4. `analytics-snapshot.test.ts`
   - Analytics data is NOT included in game snapshots (it's meta, not game state)
   - Analytics persist across `back()` rewinds (rewind doesn't erase tracking)

**Implementation:**
- Built as a `KataPlugin` using the Phase 1 plugin API
- Shipped as part of `kata-core` (opt-in, zero overhead if not used)
- No external dependencies

---

### 3.3 Accessibility (a11y)

**What:** Make Kata narratives accessible to players using screen readers, keyboard navigation, and reduced-motion preferences.

**Why:** Narrative games are inherently text-heavy — they should be *more* accessible than most games, not less. Framework-level a11y ensures every game built with Kata gets baseline accessibility for free.

**Scope:**

**`kata-core` (headless hints in KSONFrame):**
- `KSONFrame` gains an optional `a11y` field:
  ```ts
  {
    action: { type: "text", speaker: "Narrator", content: "..." },
    a11y: {
      role: "dialog",           // ARIA role hint
      liveRegion: "assertive",  // aria-live value
      label: "Narrator says: Hello world",  // screen-reader text
    }
  }
  ```
- Visual-only actions (`[bg ...]`) include `a11y.description` for screen readers
- Choices include `a11y.keyHint` for keyboard navigation (`"Press 1 for Option A"`)

**`kata-react` (concrete implementation):**
- `aria-live` regions for dialogue text (new text is announced)
- `role="group"` with `aria-label` for choice containers
- Arrow-key + Enter navigation for choices
- `prefers-reduced-motion` media query support — skip visual transitions
- Focus management: auto-focus the "Next" button or first choice

**TDD test plan:**
1. `a11y-frames.test.ts`
   - Text actions include `a11y.role` and `a11y.liveRegion`
   - Visual actions include `a11y.description`
   - Choice actions include `a11y.keyHint` for each choice
   - `a11y` field is optional (backward compatible)
2. `a11y-react.test.ts` (React Testing Library)
   - Dialogue container has `aria-live="assertive"`
   - Choices are focusable and navigable with arrow keys
   - Selecting a choice with Enter works
   - Screen reader text matches `a11y.label` content
3. `a11y-reduced-motion.test.ts`
   - When `prefers-reduced-motion` is set, visual transition hints are stripped

**Implementation:**
- Extend `KSONFrame` type with optional `a11y` field
- Engine populates `a11y` automatically based on action type
- `kata-react` components read `a11y` and apply ARIA attributes
- No breaking changes — `a11y` field is additive

---

### 3.4 Animation / Tween Timeline Actions

**What:** Timed visual sequences driven from `.kata` files — the engine emits tween frames, the UI layer (React or otherwise) implements the actual animation.

**Why:** Narrative games aren't just text. Character entrances, camera pans, UI transitions — these need timing coordination with dialogue. Currently, all visual work is deferred entirely to the UI with no engine awareness. Tween actions let authors choreograph visuals alongside narrative in `.kata` files while the engine stays headless.

**The engine does NOT animate.** It emits tween action frames. The UI layer interprets them.

**`.kata` syntax:**

```kata
:: Narrator :: The stranger approaches.

[tween target="stranger" property="x" from="100" to="400" duration="800" easing="ease-in-out"]

[tween-group parallel]
[tween target="stranger" property="opacity" to="1" duration="500"]
[tween target="bg" property="blur" to="5" duration="500"]
[/tween-group]

:: Stranger :: We need to talk.
```

**KSON representation:**

```ts
{
  type: "tween",
  target: "stranger",
  property: "x",
  from: 100,
  to: 400,
  duration: 800,
  easing: "ease-in-out",
}

{
  type: "tween-group",
  mode: "parallel",  // or "sequence"
  tweens: [
    { target: "stranger", property: "opacity", to: 1, duration: 500 },
    { target: "bg", property: "blur", to: 5, duration: 500 },
  ],
}
```

**TDD test plan:**
1. `parse-tween.test.ts`
   - Single tween directive parses to correct KSON action
   - `from`, `to`, `duration`, `easing` are parsed correctly
   - Missing `duration` produces a diagnostic
   - Missing `target` produces a diagnostic
2. `parse-tween-group.test.ts`
   - `[tween-group parallel] ... [/tween-group]` groups tweens
   - `[tween-group sequence]` sets mode to `"sequence"`
   - Nested groups produce a diagnostic (not supported)
3. `runtime-tween.test.ts`
   - Tween actions emit `"update"` with the tween frame
   - Tween actions auto-advance (fire-and-forget, like audio)
   - Tween-groups emit a single frame containing all tweens
4. `a11y-tween.test.ts`
   - Tween frames include `a11y.description` (e.g. "stranger moves into view")
   - `prefers-reduced-motion` hint is passed through

**Implementation:**
- New `tween` and `tween-group` action types in KSON
- Parser handlers for `[tween ...]` and `[tween-group]...[/tween-group]` directives
- Engine treats tweens as fire-and-forget (like audio) — emit and advance
- `kata-react` can provide a `useTween()` hook (optional, non-blocking)
- The framework provides the *timing contract*; animation libraries (Framer Motion, GSAP, CSS transitions) do the rendering

---

### Phase 3 Release Checklist

- [x] All new tests green (218 tests across 51 files)
- [x] Root README updated:
  - [x] Localization section with locale file format and API
  - [x] Analytics plugin usage example
  - [x] Accessibility section: what comes for free, how to customize
  - [x] Tween/animation syntax in Narrative Body table
  - [x] New KSON action types (`tween`, `tween-group`) documented
- [x] Package READMEs updated for affected packages (`kata-core`, `kata-react`)
- [x] Changesets created for `kata-core` (minor), `kata-react` (minor)
- [x] `bun run release` — publish `@kata-framework/core@0.4.0`, `@kata-framework/react@0.4.0`

---

## Phase 4 — Plugin Ecosystem `v0.5.0` ✅ COMPLETE

The engine is extensible (Phase 1) and ships one official plugin (analytics, Phase 3). Now build out the plugin ecosystem — more official plugins, a comprehensive authoring guide, and distribution tooling so the community can create and share their own.

> **Completed 2026-03-23.** 6 plugins (analytics subpath + 4 new + validate), scaffolder, authoring guide, and catalog shipped. 272 kata-core tests pass, all packages build.

---

### 4.1 Plugin Subpath Exports (Tree-Shakeable Architecture)

**What:** Restructure `@kata-framework/core` so that plugins are importable via isolated subpath exports. Each plugin gets its own entry point — consumers only pay for what they import.

**Why:** Currently, `analyticsPlugin` is bundled into the main `@kata-framework/core` entry point. Even if you never use it, it's in your bundle. As we add more official plugins, this becomes untenable. Subpath exports guarantee zero overhead for unused plugins regardless of the consumer's bundler capabilities.

**Import convention:**

```ts
// Core engine — zero plugin code included
import { KataEngine, parseKata } from "@kata-framework/core";

// Each plugin is a separate import — only what you use ships in your bundle
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";
import { loggerPlugin } from "@kata-framework/core/plugins/logger";
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";

// Plugin validation utility (also isolated)
import { validatePlugin } from "@kata-framework/core/plugins/validate";
```

**Implementation:**

- **`package.json` `"exports"` field** — map each subpath to its own built entry point:
  ```json
  {
    "exports": {
      ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
      "./plugins/analytics": { "types": "./dist/plugins/analytics.d.ts", "import": "./dist/plugins/analytics.js", "require": "./dist/plugins/analytics.cjs" },
      "./plugins/profanity": { "types": "./dist/plugins/profanity.d.ts", "import": "./dist/plugins/profanity.js", "require": "./dist/plugins/profanity.cjs" },
      "./plugins/auto-save": { "types": "./dist/plugins/auto-save.d.ts", "import": "./dist/plugins/auto-save.js", "require": "./dist/plugins/auto-save.cjs" },
      "./plugins/logger": { "types": "./dist/plugins/logger.d.ts", "import": "./dist/plugins/logger.js", "require": "./dist/plugins/logger.cjs" },
      "./plugins/content-warnings": { "types": "./dist/plugins/content-warnings.d.ts", "import": "./dist/plugins/content-warnings.js", "require": "./dist/plugins/content-warnings.cjs" },
      "./plugins/validate": { "types": "./dist/plugins/validate.d.ts", "import": "./dist/plugins/validate.js", "require": "./dist/plugins/validate.cjs" }
    }
  }
  ```

- **`"sideEffects": false`** — tells bundlers the entire package is tree-shakeable as a safety net

- **tsup multi-entry** — build each plugin as a separate entry point:
  ```ts
  // tsup.config.ts
  entry: [
    "index.ts",
    "src/plugins/analytics.ts",
    "src/plugins/profanity.ts",
    "src/plugins/auto-save.ts",
    "src/plugins/logger.ts",
    "src/plugins/content-warnings.ts",
    "src/plugins/validate.ts",
  ]
  ```

- **Remove plugin re-exports from `index.ts`** — the main entry no longer exports plugin factories. Plugin types (`KataPlugin` interface) remain in the main entry since they're needed by the engine.

- **Backward compatibility** — existing `import { analyticsPlugin } from "@kata-framework/core"` will stop working. This is a breaking change within the minor version, but since 0.x semver allows it and we're shipping it alongside the new plugins, it's the right time.

**TDD test plan:**
1. `plugin-exports.test.ts`
   - Importing from `@kata-framework/core` does NOT include any plugin code
   - Importing from `@kata-framework/core/plugins/analytics` returns the `analyticsPlugin` factory
   - Each plugin subpath is independently importable
   - `KataPlugin` type is still available from the main entry
2. `plugin-isolation.test.ts`
   - Each plugin entry point only depends on core types, not on other plugins
   - Plugin subpath modules can be used without importing the main entry

---

### 4.2 Official Plugins

**What:** A suite of opt-in, zero-dependency plugins shipped inside `kata-core` under isolated subpath exports. Each uses the existing `KataPlugin` interface — no engine changes required.

**Why:** The analytics plugin proved the pattern. Authors keep asking for the same features: content filtering, auto-save, debug logging, content warnings. Shipping these as official plugins means they're maintained, tested, and documented alongside the engine.

**Plugins:**

#### 4.2.1 Profanity Filter Plugin

```ts
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";

engine.use(profanityPlugin({
  words: ["badword1", "badword2"],
  replacement: "***",             // or a custom function
  scope: "text",                  // "text" | "choice" | "all"
}));
```

- Uses `beforeAction` hook to scan and censor `text` content and `choice` labels
- Configurable word list, replacement strategy (fixed string, per-character mask, or custom function)
- Scopes: `"text"` (dialogue only), `"choice"` (choice labels only), `"all"` (both)

**TDD test plan:**
1. `profanity-basic.test.ts`
   - Censors matching words in text actions
   - Censors matching words in choice labels when scope is `"all"` or `"choice"`
   - Does NOT censor when scope excludes the action type
   - Case-insensitive matching
   - Partial word matching is configurable (avoid censoring "assassin" → "***assin")
2. `profanity-config.test.ts`
   - Custom replacement string works
   - Custom replacement function receives the matched word
   - Per-character mask (`"****"` for 4-letter word) works
   - Empty word list is a no-op (plugin passes through)
   - Words can be added/removed at runtime via plugin API

#### 4.2.2 Auto-Save Plugin

```ts
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";

const autoSave = autoSavePlugin({
  interval: "scene-change",       // "scene-change" | "choice" | "every-action" | number (ms)
  maxSlots: 3,                    // rotate through N save slots
  onSave: (snapshot, slotIndex) => localStorage.setItem(`save-${slotIndex}`, JSON.stringify(snapshot)),
});
engine.use(autoSave);

autoSave.getSlots();    // [{ index: 0, timestamp, sceneId }, ...]
autoSave.pause();       // temporarily disable
autoSave.resume();
```

- Uses `beforeSceneChange` and/or `afterAction` hooks depending on interval mode
- Calls `engine.getSnapshot()` internally, passes result to user-provided `onSave` callback
- Slot rotation: oldest slot is overwritten when `maxSlots` is exceeded
- Pause/resume for cutscenes or menus where saving is inappropriate

**TDD test plan:**
1. `autosave-triggers.test.ts`
   - `"scene-change"` triggers save on scene transitions only
   - `"choice"` triggers save when a choice is made
   - `"every-action"` triggers save on every action
   - Numeric interval triggers save on a timer (tested with fake timers)
2. `autosave-slots.test.ts`
   - Saves rotate through `maxSlots` slots
   - `getSlots()` returns metadata (timestamp, sceneId) without full snapshot data
   - Oldest slot is overwritten when full
3. `autosave-control.test.ts`
   - `pause()` stops saves; `resume()` re-enables them
   - Pausing during a scene transition skips that save
   - Plugin can be removed and re-added without losing slot metadata

#### 4.2.3 Debug Logger Plugin

```ts
import { loggerPlugin } from "@kata-framework/core/plugins/logger";

engine.use(loggerPlugin({
  level: "verbose",               // "quiet" | "normal" | "verbose"
  output: (entry) => console.log(entry),  // custom sink
}));
```

- Hooks into ALL plugin lifecycle points: `beforeAction`, `afterAction`, `onChoice`, `beforeSceneChange`, `onEnd`
- Structured log entries: `{ timestamp, hook, sceneId, actionIndex, actionType, data }`
- Three verbosity levels: `quiet` (errors only), `normal` (scene changes + choices), `verbose` (every action)
- Custom output sink — defaults to `console.log`, can be redirected to file, WebSocket, etc.

**TDD test plan:**
1. `logger-hooks.test.ts`
   - Logs `beforeAction` and `afterAction` for text actions
   - Logs `onChoice` with choice ID and label
   - Logs `beforeSceneChange` with from/to scene IDs
   - Logs `onEnd` with scene ID
2. `logger-levels.test.ts`
   - `"quiet"` only logs errors (nothing for normal flow)
   - `"normal"` logs scene changes and choices but not every action
   - `"verbose"` logs everything
3. `logger-output.test.ts`
   - Custom output sink receives structured entries
   - Entries include timestamp, hook name, sceneId, actionIndex

#### 4.2.4 Content Warnings Plugin

```ts
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";

const cw = contentWarningsPlugin({
  warnings: {
    "dark-forest": ["horror", "violence"],
    "romance-arc": ["romance", "mature-themes"],
  },
  onWarn: (sceneId, tags) => { /* show UI warning before scene loads */ },
});
engine.use(cw);

cw.getWarnings("dark-forest"); // ["horror", "violence"]
cw.addWarning("new-scene", ["spoilers"]);
```

- Uses `beforeSceneChange` to fire `onWarn` callback before entering tagged scenes
- Authors register warning tags per scene ID
- Warning tags are arbitrary strings — the framework doesn't prescribe a taxonomy
- `onWarn` callback can be async — if it returns a promise, the warning is purely informational (engine doesn't block)

**TDD test plan:**
1. `cw-basic.test.ts`
   - `onWarn` fires before entering a tagged scene
   - `onWarn` does NOT fire for untagged scenes
   - Multiple tags are passed as an array
   - `getWarnings()` returns the tags for a given scene
2. `cw-management.test.ts`
   - `addWarning()` adds tags at runtime
   - Tags can be added for scenes that haven't been registered yet
   - Duplicate tags are deduplicated
3. `cw-integration.test.ts`
   - Warning fires on `makeChoice()` that transitions to a tagged scene
   - Warning fires on `start()` for a tagged scene
   - Works alongside other plugins (ordering respected)

---

### 4.3 Plugin Authoring Guide

**What:** A comprehensive `docs/plugins.md` guide that teaches developers how to build, test, and publish their own Kata plugins.

**Why:** The `KataPlugin` interface is simple, but building a good plugin requires understanding hook ordering, return conventions, state management patterns, and the engine's event flow. A guide lowers the barrier from "I can read the type" to "I can ship a plugin."

**Contents:**

1. **Quick Start** — minimal plugin in 10 lines
2. **The KataPlugin Interface** — every hook explained with when it fires, what it receives, what it returns
   - `beforeAction(action, ctx)` — transform or skip actions; return `null` to skip, return action (mutated or not) to continue
   - `afterAction(action, ctx)` — observe after frame emission; no return value
   - `onChoice(choice, ctx)` — observe when a choice is selected
   - `beforeSceneChange(fromId, toId, ctx)` — observe scene transitions
   - `onEnd(sceneId)` — observe when a scene reaches its end
3. **State Management Patterns**
   - Closure pattern (like `analyticsPlugin()`) — state lives in the factory's closure
   - Class pattern — `class MyPlugin implements KataPlugin` with instance fields
   - When to use which: closures for simple data, classes for complex state or inheritance
4. **Exposing a Custom API** — using `getPlugin<T>(name)` to let consumers call plugin-specific methods
5. **Testing Plugins** — using `@kata-framework/test-utils` to write plugin tests with `createTestEngine`
6. **Publishing** — naming convention (`kata-plugin-*`), package.json setup, peer dependency on `@kata-framework/core`, subpath exports pattern for multi-plugin packages
7. **Subpath Exports** — how official plugins use `@kata-framework/core/plugins/*` subpaths, how third-party plugins can adopt the same pattern for tree-shakeability
8. **Examples** — annotated source of the analytics plugin and profanity filter as reference implementations

**TDD test plan:** (for the example plugin built in the guide)
1. `guide-example-plugin.test.ts`
   - The example plugin from the guide actually works when copy-pasted
   - Validates that the guide's code samples are accurate

---

### 4.4 Plugin Distribution & Scaffolding

**What:** Tooling and conventions that make it easy for the community to create, discover, and use third-party plugins.

**Why:** A plugin system without distribution is just an interface. We need naming conventions for npm discoverability, a starter template for rapid development, and a catalog so authors can find community plugins.

**Deliverables:**

#### 4.4.1 `create-kata-plugin` Template

```bash
bun create kata-plugin my-awesome-plugin
```

Scaffolds:
```
my-awesome-plugin/
  src/
    index.ts          ← plugin factory + KataPlugin implementation
  tests/
    index.test.ts     ← starter test using @kata-framework/test-utils
  package.json        ← peer dep on @kata-framework/core, tsup config
  tsconfig.json
  README.md           ← template with usage example
```

- Pre-configured with tsup (CJS + ESM + DTS), bun:test, TypeScript
- README template with badges, install/usage sections
- `package.json` has correct `peerDependencies`, `main`/`module`/`types` fields
- Naming convention enforced: package name starts with `kata-plugin-`

**TDD test plan:**
1. `scaffold-output.test.ts`
   - Running the scaffolder creates the expected directory structure
   - `package.json` has correct name, peer deps, and build config
   - Generated plugin compiles without errors
   - Generated test passes out of the box
2. `scaffold-naming.test.ts`
   - Input name is normalized to `kata-plugin-{name}`
   - Invalid names (spaces, special chars) are rejected with a message

#### 4.4.2 Plugin Catalog Page

- A `docs/plugins-catalog.md` page listing:
  - **Official plugins** (shipped with `kata-core`) — profanity filter, auto-save, logger, content warnings, analytics
  - **Community plugins** — curated list with name, description, npm link, and compatibility version
- Submission process: PR to add an entry (name, npm package, description, min kata-core version)
- Each entry links to the plugin's npm page and repository

#### 4.4.3 Plugin Validation Utility

```ts
import { validatePlugin } from "@kata-framework/core/plugins/validate";

const result = validatePlugin(myPlugin);
// { valid: true } or { valid: false, errors: ["Missing 'name' property", ...] }
```

- Validates the `KataPlugin` interface at runtime (useful for dynamic loading)
- Checks: `name` is a non-empty string, hooks are functions (if present), no unknown properties
- Used internally by `engine.use()` to give helpful errors instead of silent failures

**TDD test plan:**
1. `validate-plugin.test.ts`
   - Valid plugin passes validation
   - Missing `name` produces an error
   - Non-function hook values produce errors
   - Extra properties produce a warning (not an error)
   - `engine.use()` calls `validatePlugin` internally and throws on invalid

---

### Phase 4 Release Checklist

- [x] All new tests green
- [x] Root README updated:
  - [x] Official plugins section with usage examples for each
  - [x] Link to plugin authoring guide
  - [x] Link to plugin catalog
  - [x] `create-kata-plugin` usage in Getting Started
- [x] Plugin authoring guide published at `docs/plugins.md`
- [x] Plugin catalog published at `docs/plugins-catalog.md`
- [x] Package READMEs updated (`kata-core`)
- [x] `create-kata-plugin` template published to npm
- [x] Changesets created for `kata-core` (minor)
- [x] `bun run release` — publish `@kata-framework/core@0.5.0`, `create-kata-plugin@0.1.0`

---

## Phase 5 — Multiplayer `v0.6.0`

The most ambitious phase. A narrative engine that supports shared experiences — from two tabs on the same device to networked rooms with dozens of players.

**Design philosophy:** The `KataEngine` itself does not change. Multiplayer is a layer that wraps it. On the authority node, the engine runs normally. The sync layer captures method calls and broadcasts results. On follower nodes, the sync layer receives events and forwards frames to the UI. This means Phase 5 requires **zero breaking changes** to `kata-core`.

---

### 5.1 Sync Architecture & Transport Interface

**What:** Define the sync protocol, transport abstraction, and authority model.

**Core types:**

```ts
// What gets sent over the wire
type SyncEvent = {
  type: "start" | "next" | "choice" | "set-context" | "snapshot";
  payload: unknown;
  playerId: string;
  seq: number;          // monotonic sequence number
  timestamp: number;
};

// Transport abstraction — implement once per transport
interface KataSyncTransport {
  send(event: SyncEvent): void;
  onReceive(handler: (event: SyncEvent) => void): void;
  onConnectionChange(handler: (state: ConnectionState) => void): void;
  connect(roomId: string, options?: ConnectOptions): Promise<void>;
  disconnect(): void;
  readonly state: ConnectionState;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
```

**Authority model — host-authoritative by default:**
- One node (the host) runs the real `KataEngine`
- Other nodes send *intents* ("I want to choose option 2") to the host
- The host validates, calls `engine.makeChoice(2)`, and broadcasts the resulting `KSONFrame`
- If the host disconnects, the next-oldest peer becomes host (authority migration)

**Package:** `@kata-framework/sync` — new package under `packages/kata-sync/`

**TDD test plan:**
1. `sync-event.test.ts`
   - `SyncEvent` serializes and deserializes correctly
   - Sequence numbers are monotonically increasing
   - Events include player ID and timestamp
2. `transport-interface.test.ts`
   - Mock transport can send and receive events
   - Connection state transitions correctly
   - Disconnect cleans up handlers
3. `authority.test.ts`
   - Authority node processes intents and broadcasts confirmed events
   - Non-authority nodes cannot directly mutate engine state
   - Authority migration on disconnect assigns to oldest peer
4. `sync-manager.test.ts`
   - Wraps a `KataEngine` and intercepts `next()`, `makeChoice()`, `start()`
   - On authority: executes locally, broadcasts result
   - On follower: sends intent, waits for confirmed event

---

### 5.2 BroadcastChannel Transport (same-device)

**What:** The simplest transport — two browser tabs share a story session with zero infrastructure.

**Why:** Proves the entire sync architecture works before any networking complexity. Also useful for local co-op and development/testing.

```ts
import { KataSyncManager, BroadcastChannelTransport } from "@kata-framework/sync";

const transport = new BroadcastChannelTransport();
const sync = new KataSyncManager(engine, transport);

await sync.connect("my-room", { playerId: "player-1" });
// First to connect becomes authority automatically

engine.start("intro"); // Broadcasts to all tabs
```

**TDD test plan:**
1. `broadcast-transport.test.ts`
   - Messages sent on one transport are received by another
   - Multiple transports on the same room ID all receive broadcasts
   - Disconnect stops receiving messages
2. `broadcast-authority.test.ts`
   - First connection becomes authority
   - Second connection becomes follower
   - Authority actions are reflected on follower
3. `broadcast-latejoin.test.ts`
   - Late-joining tab receives a state snapshot
   - Late-joiner can immediately see the current frame

**Implementation:**
- `BroadcastChannelTransport` implements `KataSyncTransport`
- Uses `BroadcastChannel` API (built into browsers, polyfillable for Bun tests)
- ~200 lines of code

---

### 5.3 WebSocket Transport (networked)

**What:** Room-based networked multiplayer. A lightweight server connects players across devices.

**Server (`KataServer`):**

```ts
import { KataServer } from "@kata-framework/sync/server";

const server = new KataServer({ port: 3000 });

// Server runs a KataEngine per room — fully authoritative
server.on("room-created", (roomId) => { /* log */ });
server.on("player-joined", (roomId, playerId) => { /* log */ });
```

**Client:**

```ts
import { KataSyncManager, WebSocketTransport } from "@kata-framework/sync";

const transport = new WebSocketTransport("ws://localhost:3000");
const sync = new KataSyncManager(engine, transport);

await sync.connect("room-abc", { playerId: "player-1" });
```

**Choice policies — configurable per scene:**

```ts
// Who decides when multiple players face a choice?
sync.setChoicePolicy({ type: "first-writer" });         // first click wins
sync.setChoicePolicy({ type: "designated", playerId: "player-1" }); // DM mode
sync.setChoicePolicy({
  type: "vote",
  timeout: 10000,
  resolver: (votes) => { /* majority wins */ },
});
```

**Player presence:**

```ts
sync.on("player-joined", (player) => { /* update UI */ });
sync.on("player-left", (player) => { /* update UI */ });
sync.getPlayers(); // [{ id: "player-1", connected: true, role: "authority" }, ...]
```

**TDD test plan:**
1. `websocket-transport.test.ts`
   - Client connects to server and receives acknowledgment
   - Messages are relayed to all clients in the same room
   - Rooms are isolated (room A clients don't see room B messages)
   - Reconnection replays events from last known sequence number
2. `server-rooms.test.ts`
   - Creating a room starts a `KataEngine` instance on the server
   - Players can join and leave rooms
   - Empty rooms are cleaned up after a timeout
   - Server emits lifecycle events (room-created, player-joined, player-left)
3. `choice-policies.test.ts`
   - `first-writer`: first choice received wins, others are discarded
   - `designated`: only the designated player's choice is accepted
   - `vote`: collects choices until timeout, resolves with provided function
   - Policy can change mid-session
4. `late-join.test.ts`
   - New player receives full state snapshot on connect
   - New player sees the current frame immediately
   - New player's `history` reflects the full session history
5. `presence.test.ts`
   - `player-joined` and `player-left` events fire correctly
   - `getPlayers()` returns current roster with connection state
   - Spectator mode: `{ role: "spectator" }` — receives frames but cannot send intents

**React hook:**

```tsx
import { useKataMultiplayer } from "@kata-framework/react";

function Lobby() {
  const { players, isAuthority, connect, disconnect } = useKataMultiplayer();
  // ...
}
```

**Implementation:**
- `WebSocketTransport` implements `KataSyncTransport`
- `KataServer` uses Bun's native WebSocket or `ws` package
- Room management: `Map<roomId, { engine, players, eventLog }>`
- `useKataMultiplayer()` hook in `kata-react`

---

### 5.4 State Partitioning & Advanced Sync

**What:** Shared vs per-player state, per-player scene branching, and sync points.

**Why:** Some narratives need players to share one story (visual novel read-along). Others need per-player branches that reconverge (each player explores different areas, then meets at a boss fight). The framework should support both without requiring the author to build it from scratch.

**State model:**

```ts
// Configured per scene in frontmatter
---
id: exploration
multiplayer:
  mode: branching      # "shared" or "branching"
  choicePolicy: per-player
  syncPoint: @boss/fight  # all branches reconverge here
---
```

```ts
// In code
sync.getSharedCtx();                    // state all players see
sync.getPlayerCtx("player-1");          // state only player-1 sees
sync.getPlayerPosition("player-1");     // which scene/action player-1 is at
```

**TDD test plan:**
1. `shared-mode.test.ts`
   - All players see the same scene and action index
   - `ctx` changes are visible to all players
   - One player's choice advances everyone
2. `branching-mode.test.ts`
   - Each player can be on a different scene
   - `ctx` changes are isolated to the player who made them
   - `sharedCtx` is still visible and writable by all
3. `sync-points.test.ts`
   - When all players reach a sync point scene, playback resumes in shared mode
   - Players who arrive early wait (engine does not advance past the sync point)
   - Late arrivals trigger continuation once all are present
4. `state-partitioning.test.ts`
   - `getSharedCtx()` returns the shared portion
   - `getPlayerCtx(id)` returns only that player's data
   - Snapshots include both shared and per-player state

**Implementation:**
- Extend `GameState` with `sharedCtx` and `playerCtx` maps
- `KataSyncManager` routes `ctx` mutations based on multiplayer mode
- Sync points tracked as barriers: `Map<syncPointId, Set<arrivedPlayerIds>>`
- Frontmatter `multiplayer` field parsed by `parseKata()`

---

### Phase 5 Release Checklist

- [ ] All new tests green
- [ ] Root README updated:
  - [ ] Multiplayer section: quick start with BroadcastChannel, then WebSocket
  - [ ] Choice policies documented with examples
  - [ ] State partitioning (shared vs branching) explained with frontmatter syntax
  - [ ] `@kata-framework/sync` added to Packages table
  - [ ] `useKataMultiplayer()` hook documented in React section
- [ ] Package READMEs updated for affected packages (`kata-core`, `kata-react`, `kata-sync`)
- [ ] Changesets created for `kata-core` (minor), `kata-react` (minor), `kata-sync` (initial)
- [ ] `bun run release` — publish `@kata-framework/core@0.6.0`, `@kata-framework/react@0.6.0`, `@kata-framework/sync@0.1.0`

---

## Summary

| Phase | Version | Packages Affected | Key Deliverables |
|-------|---------|-------------------|------------------|
| **1 — Extensibility** | `0.2.0` | `kata-core`, `kata-test-utils` (new) | Plugin system, test utils, undo/rewind, error diagnostics |
| **2 — Authoring** | `0.3.0` | `kata-core`, `kata-cli`, `kata-lsp` (new), `kata-vscode` | LSP (diagnostics, autocomplete, go-to-def), scene graph viz (CLI + VS Code), syntax extensions (`[wait]`, `[exec]`, `:::else`) |
| **3 — Reach** | `0.4.0` | `kata-core`, `kata-react` | i18n / localization, branching analytics plugin, accessibility (ARIA + keyboard), animation/tween timelines |
| **4 — Plugin Ecosystem** | `0.5.0` | `kata-core`, `create-kata-plugin` (new) | Subpath exports (`core/plugins/*`), official plugins (profanity, auto-save, logger, content warnings), plugin authoring guide, `create-kata-plugin` scaffolder, plugin catalog, validation utility |
| **5 — Multiplayer** | `0.6.0` | `kata-core`, `kata-react`, `kata-sync` (new) | Sync protocol, BroadcastChannel transport, WebSocket rooms + server, choice policies, state partitioning, player presence |

Each phase ships with: passing TDD test suite, updated README (guide-style with examples), changesets, and published packages.
