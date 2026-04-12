# @kata-framework/core

Headless narrative engine for interactive fiction, visual novels, and text adventures. Parse `.kata` scene files into KSON, run them with `KataEngine`, and consume typed frames in any UI framework.

## Install

```bash
bun add @kata-framework/core
```

## Quick Start

```ts
import { parseKata, KataEngine } from "@kata-framework/core";

const scene = parseKata(`
---
id: intro
title: The Beginning
---
:: Narrator :: Welcome, ${player.name}. You have ${player.gold} gold.

:::if{cond="player.gold > 50"}
:: Merchant :: Care to browse my wares?
:::else
:: Merchant :: Come back when you have coin.
:::

* [Buy a sword] -> @shop
* [Leave] -> @town
`);

const engine = new KataEngine({ player: { name: "Hero", gold: 100 } });
engine.registerScene(scene);

engine.on("update", (frame) => {
  console.log(frame.action); // { type: "text", speaker: "Narrator", content: "..." }
});
engine.on("end", ({ sceneId }) => console.log("Scene ended:", sceneId));

engine.start("intro");
engine.next();
engine.makeChoice("c_0");
```

## Features

### Engine API

| Method | Description |
|--------|-------------|
| `parseKata(content)` | Parse a `.kata` string → `KSONScene` |
| `parseKataWithDiagnostics(content)` | Parse with validation warnings/errors |
| `new KataEngine(ctx, options?)` | Create engine with initial context and options |
| `engine.registerScene(scene)` | Register a parsed scene by `scene.meta.id` |
| `engine.start(sceneId)` | Start a scene, emit the first frame |
| `engine.next()` | Advance to next action |
| `engine.makeChoice(choiceId)` | Pick a choice; jumps to target scene if present |
| `engine.back()` | Undo last action — restores ctx, scene, and action index |
| `engine.use(plugin)` | Register a plugin with lifecycle hooks |
| `engine.getSnapshot()` / `engine.loadSnapshot(raw)` | Save/load with Zod-validated migration |

### Engine Events

| Event | Payload | When |
|-------|---------|------|
| `"update"` | `KSONFrame` | A new frame is ready to render |
| `"end"` | `{ sceneId }` | Scene has no more actions |
| `"audio"` | `AudioCommand` | Audio action fired (auto-advances) |
| `"error"` | `Diagnostic` | Non-fatal error (bad condition, interpolation failure) |
| `"preload"` | `string[]` | Asset IDs to preload |

### `.kata` Syntax

| Syntax | Description |
|--------|-------------|
| `[bg src="file.mp4"]` | Visual directive |
| `:: Speaker :: text` | Dialogue action |
| `* [Label] -> @scene/id` | Choice with optional scene target |
| `:::if{cond="expr"} ... :::elseif{cond="..."} ... :::else ... :::` | Conditional block with branches |
| `[wait 2000]` | Pause playback (ms) |
| `[exec] ... [/exec]` | Inline code execution |
| `// comment` | Comment line (stripped) |
| `${expression}` | Variable interpolation |
| `[tween target="x" property="y" to="1" duration="500"]` | Animation tween |
| `[tween-group parallel] ... [/tween-group]` | Grouped tweens (parallel or sequence) |
| `[audio play bgm "night-rain.mp3"]` | Play audio on a channel |
| `[audio stop bgm]` | Stop a channel |
| `[audio pause bgm]` | Pause a channel |
| `[audio volume bgm 0.3]` | Set channel volume |

### KSON Action Types

| Type | Shape |
|------|-------|
| `text` | `{ type: "text", speaker, content }` |
| `choice` | `{ type: "choice", choices: [{ id, label, target?, condition?, action? }] }` |
| `visual` | `{ type: "visual", layer, src, effect? }` |
| `condition` | `{ type: "condition", condition, then, elseIf?, else? }` |
| `wait` | `{ type: "wait", duration }` |
| `exec` | `{ type: "exec", code }` |
| `audio` | `{ type: "audio", command: AudioCommand }` |
| `tween` | `{ type: "tween", target, property, from?, to, duration, easing? }` |
| `tween-group` | `{ type: "tween-group", mode: "parallel" \| "sequence", tweens: [...] }` |

### Plugin System

```ts
engine.use({
  name: "my-plugin",
  init(engine) { /* called once on registration */ },
  beforeAction(action, ctx) { console.log(action); return action; },
  afterAction(action, ctx) { /* ... */ },
  onChoice(choice, ctx) { /* ... */ },
  beforeSceneChange(fromId, toId, ctx) { /* ... */ },
  onEnd(sceneId) { /* ... */ },
});
```

Plugins are validated on registration — invalid objects throw with descriptive errors. See the [Plugin Authoring Guide](../../docs/plugins.md) for details.

### Official Plugins

All official plugins are tree-shakeable via subpath exports — you only pay for what you import.

```ts
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";
import { loggerPlugin } from "@kata-framework/core/plugins/logger";
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";
import { validatePlugin } from "@kata-framework/core/plugins/validate";
```

| Plugin | Description |
|--------|-------------|
| **Analytics** | Track scene visits, choice selections, drop-off points, session duration |
| **Profanity Filter** | Censor text/choice labels — configurable word list, replacement strategies, scoping |
| **Auto-Save** | Automatic snapshots on scene changes, choices, every action, or timed intervals |
| **Debug Logger** | Structured lifecycle logging with quiet/normal/verbose levels |
| **Content Warnings** | Tag scenes with warning labels, fire callbacks before entry |
| **Validate** | Runtime plugin validation utility (also used internally by `engine.use()`) |

### Web Audio Manager

Real audio playback using the Web Audio API. Channels (bgm, sfx, voice) with independent volume, crossfading, and browser autoplay policy handling.

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
audio.unmute("sfx");
audio.stopAll();
audio.resume(); // handle browser autoplay policy
audio.preload(["night-rain.mp3", "thunder.wav"]); // decode ahead of time
```

| Method | Description |
|--------|-------------|
| `audio.handler` | Event handler — pass to `engine.on("audio", audio.handler)` |
| `audio.setVolume(channel, vol)` | Set channel volume (0-1) |
| `audio.mute(channel)` / `unmute(channel)` | Mute/unmute a channel (restores previous volume) |
| `audio.stopAll()` | Stop all channels with fade-out |
| `audio.resume()` | Resume after browser autoplay suspension — flushes queued commands |
| `audio.preload(urls)` | Decode audio files ahead of time into the buffer cache |

Audio buffers are cached in an LRU cache — second plays are instant. When a BGM track is already playing, starting a new one crossfades automatically.

### Asset Pipeline

Load, cache, and track progress for images, audio, and data files.

```ts
import { AssetPipeline } from "@kata-framework/core/assets";

const pipeline = new AssetPipeline({
  basePath: "/assets/",
  maxConcurrent: 4,       // max parallel fetches
  maxCacheSize: 200,       // LRU cache entries
});

// Preload with progress
const handle = pipeline.preload(["bg/forest.jpg", "audio/wind.mp3", "data/config.json"]);
handle.onProgress((loaded, total) => console.log(`${loaded}/${total}`));
const { errors } = await handle.complete;

// Retrieve loaded assets
const image = pipeline.get("bg/forest.jpg");
const json = pipeline.get<{ key: string }>("data/config.json");

// Cache management
pipeline.isLoaded("bg/forest.jpg"); // true
pipeline.evict("bg/forest.jpg");
pipeline.clear();

// Integrate with engine preload events
engine.on("preload", (ids) => pipeline.preload(ids));
```

Assets are decoded by file extension: `.json` files are parsed, audio files return `ArrayBuffer`, images return `Blob`. The concurrent fetch queue ensures no more than `maxConcurrent` requests are in-flight at once.

### Additional Modules

- **Save/Load** — `engine.getSnapshot()` / `engine.loadSnapshot(raw)` with Zod validation and versioned migration
- **Modding** — `LayeredVFS` for file overlay, `mergeScene()` for RFC 7396-style scene patching
- **Assets** — `AssetRegistry` for ID→URL mapping, `SceneGraph` for connectivity analysis and preloading
- **Scene Graph** — `getOrphans()`, `getDeadEnds()`, `toJSON()`, `toDOT()` for story structure analysis

### Localization (i18n)

```ts
engine.setLocale("ja");
engine.setLocaleFallback("en");
engine.registerLocale("intro", "ja", [
  { index: 0, content: "森へようこそ、${player.name}。" },
  { index: 2, speaker: "商人", content: "おお、裕福な旅人！" },
]);
```

Locale overrides are resolved before variable interpolation. Locale state is included in snapshots.

### Analytics Plugin

```ts
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";

const analytics = analyticsPlugin();
engine.use(analytics);

// After gameplay
const report = analytics.getReport();
// { sceneVisits, choiceSelections, dropOffPoints, averageActionsPerScene, sessionDuration }

analytics.toJSON(); // serializable export
analytics.reset();  // clear all data
```

### Accessibility

Every `KSONFrame` includes an optional `a11y` field with hints for screen readers:

- **Text** — `{ role: "dialog", liveRegion: "assertive", label: "Speaker says: ..." }`
- **Choice** — `{ role: "group", keyHints: [{ choiceId, hint: "Press N for Label" }] }`
- **Visual** — `{ role: "img", description: "Visual: src on layer" }`
- **Tween** — `{ description: "target animates property", reducedMotion: true }`

All logic evaluation uses `new Function` with explicit context — never `eval()`.

### Graceful Scene Resolution

By default, navigating to a missing scene throws. Configure `onMissingScene` for graceful error recovery:

```ts
const engine = new KataEngine(ctx, {
  onMissingScene: "error-event",  // "throw" (default) | "error-event" | "fallback"
  fallbackSceneId: "error-scene", // used when onMissingScene is "fallback"
});

engine.on("error", (diagnostic) => {
  // { level: "error", message: "Scene \"x\" not found", sceneId: "x" }
});
```

| Strategy | Behavior |
|----------|----------|
| `"throw"` | Throws `Error` (backward-compatible default) |
| `"error-event"` | Emits `"error"` event, stays on current scene, does not crash |
| `"fallback"` | Emits `"error"` event, transitions to `fallbackSceneId`, sets `ctx._errorSceneId` |

### Evaluation Sandbox

Expression evaluation (`evaluate()`, `evaluateWithDiagnostic()`) and exec blocks are sandboxed:

- **Blocked globals** — `process`, `require`, `fetch`, `XMLHttpRequest`, `globalThis`, `window`, `self`, `global`, `__proto__`, `constructor` are shadowed as `undefined` (user context keys with the same name still work)
- **Loop guard** — exec blocks with `while`/`for`/`do` loops are instrumented with an iteration counter; exceeding `evalTimeout` (default 100,000 iterations) throws an error caught by the engine
- **Prototype isolation** — exec block context uses a null-prototype object, preventing `__proto__` traversal

```ts
const engine = new KataEngine(ctx, {
  evalTimeout: 50_000,  // max loop iterations in exec blocks (default: 100,000)
});
```
