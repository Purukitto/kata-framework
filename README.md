# Kata Framework

**A Headless, Media-First Narrative Engine for Modern Web Apps.**

Kata Framework is a headless runtime designed for creating interactive narratives, visual novels, and text adventures. It parses `.kata` scene files, strictly evaluates logic and conditionals, and drives any UI framework (React, Vue, or vanilla JS) via a predictable protocol.

**You own the look and feel; Kata owns the story state and flow.**

---

## Packages

| Package | Description |
|---------|-------------|
| [`@kata-framework/core`](./packages/kata-core) | Pure headless engine — parser, runtime, store, audio, VFS, modding, assets |
| [`@kata-framework/react`](./packages/kata-react) | React 19 bindings — `<KataProvider>`, `useKata()`, `KataDebug` |
| [`@kata-framework/cli`](./packages/kata-cli) | CLI tool — watch `.kata` files and compile to KSON JSON |
| [`@kata-framework/test-utils`](./packages/kata-test-utils) | Test utilities — `createTestEngine()`, `collectFrames()`, `assertFrame()` |
| [`kata-vscode`](./packages/kata-vscode) | VS Code extension — syntax highlighting for `.kata` files |

---

## Quick Start

### Installation

```bash
# Core engine (required)
bun add @kata-framework/core

# React bindings (optional — only if using React)
bun add @kata-framework/react

# CLI tool (optional — for .kata → JSON compilation)
bun add -g @kata-framework/cli
```

### Write a Scene

Create a file called `intro.kata`:

```kata
---
id: intro
title: The Beginning
assets:
  bg: /images/forest.jpg
  bgm: /audio/theme.mp3
---

<script>
ctx.player = { name: "Hero", gold: 100 };
</script>

[bg src="forest.jpg"]

:: Narrator ::
Welcome to the forest, ${player.name}. You have ${player.gold} gold.

:::if{cond="player.gold > 50"}
:: Merchant ::
Ah, a wealthy traveler! Care to browse my wares?
:::

* [Buy a sword (-30g)] -> @shop/buy-sword
* [Continue into the forest] -> @forest/deep
* [Turn back] -> @town/gate
```

### Run with the Engine (Headless)

```ts
import { parseKata, KataEngine } from "@kata-framework/core";

// Parse a .kata file
const scene = parseKata(kataSource);

// Create engine with initial context
const engine = new KataEngine({ player: { name: "Hero", gold: 100 } });
engine.registerScene(scene);

// Listen for frames
engine.on("update", (frame) => {
  console.log(frame.action); // { type: "text", speaker: "Narrator", content: "..." }
});

// Start playback
engine.start("intro");

// Advance through the story
engine.next();

// Handle player choices
engine.makeChoice("buy-sword");
```

### Run with React

```tsx
import { KataProvider, useKata } from "@kata-framework/react";
import { parseKata } from "@kata-framework/core";

const scenes = [parseKata(introSource), parseKata(shopSource)];

function App() {
  return (
    <KataProvider config={{ player: { name: "Hero" } }} initialScenes={scenes}>
      <Game />
    </KataProvider>
  );
}

function Game() {
  const { frame, state, actions } = useKata();

  if (!frame) return <button onClick={() => actions.start("intro")}>Start</button>;

  if (frame.action.type === "text") {
    return (
      <div>
        <strong>{frame.action.speaker}:</strong> {frame.action.content}
        <button onClick={actions.next}>Next</button>
      </div>
    );
  }

  if (frame.action.type === "choice") {
    return (
      <div>
        {frame.action.choices.map((c) => (
          <button key={c.id} onClick={() => actions.makeChoice(c.id)}>{c.label}</button>
        ))}
      </div>
    );
  }
}
```

---

## `.kata` File Format

A `.kata` file has three sections in order:

### 1. YAML Frontmatter

```yaml
---
id: scene-id          # required, unique identifier
title: Scene Title     # optional
layout: cinematic      # optional, hint for UI
assets:                # optional, id → URL map
  bg: /images/bg.jpg
  bgm: /audio/music.mp3
---
```

### 2. Script Block

```html
<script>
ctx.player.gold -= 30;
ctx.hasKey = true;
</script>
```

Logic runs securely via `new Function` (never `eval`). Access game state through `ctx`.

### 3. Narrative Body

| Syntax | Description |
|--------|-------------|
| `[bg src="file.mp4"]` | Visual directive — set a background/video layer |
| `[bg src="file.mp4" transition="fade"]` | Visual directive with a transition effect |
| `:: Speaker :: dialogue text` | Text action — character speaks |
| `* [Label] -> @scene/id` | Choice — player picks, engine jumps to target scene |
| `:::if{cond="expr"} ... :::` | Conditional block — content only appears when condition is true |
| `${expression}` | Interpolation — inline variable values in text |

Under the hood, the engine also supports these action types in KSON (useful when building scenes programmatically):

| KSON Action Type | Description |
|------------------|-------------|
| `{ type: "wait", duration: 2000 }` | Pause playback for a duration (ms) |
| `{ type: "exec", code: "ctx.gold += 10" }` | Run logic mid-scene without a `<script>` block |
| `{ type: "audio", command: { ... } }` | Fire-and-forget audio command (see [Audio System](#audio-system)) |

Choices also support optional fields for advanced branching:

```ts
{
  id: "bribe",
  label: "Bribe the guard",
  target: "@castle/gate",
  condition: "player.gold >= 50",  // only show this choice when true
  action: "ctx.gold -= 50"         // run logic when chosen
}
```

---

## Data Flow

```
.kata file
    │
    ▼
parseKata()          → KSONScene { meta, script, actions[] }
    │
    ▼
engine.registerScene(scene)
    │
    ▼
engine.start(sceneId)
    │
    ▼
engine emits "update" → KSONFrame { meta, action, state }
    │
    ▼
UI renders from KSONFrame
    │
    ▼
User interaction → engine.next() / engine.makeChoice(id)
    │
    ▼
engine emits next "update" → loop continues
    │
    ▼
engine emits "end"   → scene complete
```

The `KSONFrame` is the **single contract** between engine and UI. Your UI should only consume frames — never reach into internal engine state.

---

## Audio System

The engine supports fire-and-forget audio actions that auto-advance (non-blocking):

```ts
import { KataEngine, NoopAudioManager } from "@kata-framework/core";
import type { AudioCommand } from "@kata-framework/core";

const engine = new KataEngine();

// Listen for audio commands
engine.on("audio", (cmd: AudioCommand) => {
  // cmd.action is "play" | "stop" | "setVolume" | "fade"
  // Route to your audio implementation (Web Audio API, Howler.js, etc.)
});
```

In `.kata` files, audio actions are defined as KSON actions with `type: "audio"`. The engine emits them and advances to the next action automatically.

For testing or headless environments, use `NoopAudioManager` which implements the full `AudioManager` interface as a no-op.

---

## Save / Load

```ts
// Save
const snapshot = engine.getSnapshot();
localStorage.setItem("save", JSON.stringify(snapshot));

// Load
const raw = JSON.parse(localStorage.getItem("save")!);
engine.loadSnapshot(raw);  // Zod-validated + auto-migrated
```

Register custom migrations for schema evolution:

```ts
engine.registerMigration(1, (data) => {
  // Migrate v1 → v2: add new field with default
  data.ctx.reputation = 0;
  return data;
});
```

---

## Modding System

### Layered VFS

Override base game files without mutation:

```ts
import { LayeredVFS } from "@kata-framework/core";

const vfs = new LayeredVFS();
vfs.addLayer("base", baseProvider);   // lowest priority
vfs.addLayer("mod-a", modProvider);   // overrides base

const content = await vfs.readFile("scenes/intro.kata");
// Returns mod-a's version if it exists, otherwise base

// List merged directory entries across all layers
const files = await vfs.listDir("scenes/");

// Manage layers at runtime
vfs.removeLayer("mod-a");
vfs.getLayers(); // ["base"]
```

### Scene Merging

Patch existing scenes without replacing them entirely:

```ts
import { mergeScene } from "@kata-framework/core";

const patched = mergeScene(baseScene, {
  meta: { title: "Modded Intro" },
  actions: [
    { op: "append", actions: [{ type: "text", speaker: "Mod NPC", content: "New dialogue!" }] },
    { op: "replace", index: 2, action: { type: "text", speaker: "A", content: "Changed line" } },
    { op: "remove", index: 5 },
  ],
});
```

---

## Asset Preloading

```ts
import { AssetRegistry, SceneGraph, KataEngine } from "@kata-framework/core";

const registry = new AssetRegistry();
registry.registerFromScene(scene); // extracts meta.assets + visual src

const graph = new SceneGraph();
graph.buildFromScenes(allScenes);

// Get assets for current scene + 2 hops of reachable scenes
const toPreload = graph.getPreloadSet("intro", registry, 2);

// Engine emits "preload" event automatically when registry is set
engine.setAssetRegistry(registry);
engine.on("preload", (assetIds) => {
  // Preload these assets in your UI layer
});
```

---

## Engine Events

The engine communicates entirely through events. Listen to these to drive your UI:

| Event | Payload | When |
|-------|---------|------|
| `"update"` | `KSONFrame` | A new frame is ready to render |
| `"end"` | — | The current scene has no more actions |
| `"audio"` | `AudioCommand` | An audio action fired (auto-advances) |
| `"error"` | `Diagnostic` | A non-fatal error occurred (bad condition, interpolation failure) |
| `"preload"` | `string[]` | Asset IDs to preload (when an `AssetRegistry` is set) |

---

## CLI Usage

```bash
# Compile a single file
kata build scenes/intro.kata -o dist/

# Watch and compile all .kata files
kata build "scenes/**/*.kata" -o dist/ --watch

# Output: dist/intro.kson.json, dist/shop.kson.json, ...
```

You can also create a `kata.config.json` in your project root to avoid repeating flags:

```json
{
  "input": "scenes/**/*.kata",
  "output": "dist/kson"
}
```

The CLI resolves config as: **CLI flags → `kata.config.json` → defaults**.

---

## VS Code Extension

The `kata-vscode` package provides syntax highlighting for `.kata` files:

- YAML frontmatter highlighting
- JavaScript in `<script>` blocks
- Speaker/dialogue coloring (`:: Speaker :: text`)
- Conditional blocks (`:::if{cond="..."}`)
- Choice syntax (`* [Label] -> @target`)
- Variable interpolation (`${expr}`)

Install from the `packages/kata-vscode` directory or package it with `vsce`:

```bash
cd packages/kata-vscode
npx @vscode/vsce package
# Install the generated .vsix in VS Code
```

---

## Plugins

Extend the engine with hooks that run before/after actions, on choices, and on scene transitions. See the **[Plugin Guide](./docs/plugins.md)** for full documentation.

```ts
import type { KataPlugin } from "@kata-framework/core";

const logger: KataPlugin = {
  name: "logger",
  beforeAction(action, ctx) {
    console.log(`[${action.type}]`, action);
    return action;
  },
  onChoice(choice, ctx) {
    console.log(`Player chose: ${choice.label}`);
  },
};

engine.use(logger);
engine.getPlugins();       // ["logger"]
engine.removePlugin("logger");
```

---

## Undo / Rewind

The engine maintains an undo stack for player comfort and debugging:

```ts
// Create engine with custom history depth (default: 50)
const engine = new KataEngine(initialCtx, { historyDepth: 100 });

// Advance through the story
engine.start("intro");
engine.next();
engine.next();

// Go back one step — restores ctx, scene, action index
engine.back();

// Undo stack is included in snapshots
const snapshot = engine.getSnapshot(); // snapshot.undoStack preserved
engine.loadSnapshot(snapshot);         // rewind capability restored
```

---

## Error Diagnostics

The engine never crashes on bad user expressions. Failed conditions are treated as `false`, and broken interpolations return partial results. Non-fatal errors are emitted as `"error"` events:

```ts
engine.on("error", (diagnostic) => {
  console.warn(`[${diagnostic.level}] ${diagnostic.message}`, {
    sceneId: diagnostic.sceneId,
    actionIndex: diagnostic.actionIndex,
  });
});
```

For static analysis during authoring, use `parseKataWithDiagnostics()`:

```ts
import { parseKataWithDiagnostics } from "@kata-framework/core";

const { scene, diagnostics } = parseKataWithDiagnostics(source);
for (const d of diagnostics) {
  console.log(`${d.level}: ${d.message} (line ${d.line})`);
}
```

---

## Test Utilities

The `@kata-framework/test-utils` package eliminates boilerplate in tests:

```ts
import { createTestEngine, collectFrames, assertFrame, mockAudioManager } from "@kata-framework/test-utils";

// Quick engine setup from raw .kata content
const { engine, frames } = createTestEngine("---\nid: test\n---\n:: A :: Hello\n");
engine.start("test");

// Collect all frames until end or choice
const allFrames = collectFrames(engine, "test");

// Partial matching assertions
assertFrame(allFrames[0], { type: "text", speaker: "A", content: "Hello" });

// Mock audio
const audio = mockAudioManager();
engine.on("audio", audio.handler);
```

---

## Key Features

- **Headless runtime** — Zero built-in UI. Bring your own components, styling, and animations.
- **KSON protocol** — `.kata` → strict typed JSON structure. UI renders from frames alone.
- **Secure evaluation** — Logic runs via `new Function` with explicit context. Never `eval()`.
- **Zod validation** — Snapshots and schemas are validated at boundaries.
- **Modding** — Layered VFS + scene merging for safe third-party content.
- **Audio** — Headless audio command system, implement with any audio library.
- **Asset management** — Registry + scene graph for intelligent preloading.
- **Save/load** — Versioned snapshots with automatic migration pipeline.

---

## Contributing & Development

Kata Framework uses [Bun](https://bun.sh/) for package management and [Changesets](https://github.com/changesets/changesets) for release versioning.

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run all tests
bun test

# Run tests for a single package
cd packages/kata-core && bun test
```

When submitting a PR that modifies the public API of `@kata-framework/core` or `@kata-framework/react`, generate a changeset:

```bash
bun run changeset
```
