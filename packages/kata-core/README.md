# @kata/core

Headless narrative engine: parse `.kata` scenes into KSON, run them with **KataEngine**, and consume **frames** (meta + action + state) in any environment.

---

## Usage

```ts
import { KataEngine } from "kata-core/src/runtime/index";
import { parseKata } from "kata-core/src/parser/index";

// 1. Parse a .kata scene (string or file content)
const scene = parseKata(`
---
id: intro
---
:: Narrator ::
You have \${player.gold} gold.

* [Buy Item] -> @shop
* [Leave] -> @end
`);

// 2. Create the engine with initial context
const engine = new KataEngine({
  player: { gold: 50 },
});

// 3. Register one or more scenes
engine.registerScene(scene);

// 4. Subscribe to frame updates (headless: you decide what to do with each frame)
engine.on("update", (frame) => {
  console.log(frame.action.type, frame.action);
});
engine.on("end", ({ sceneId }) => {
  console.log("Scene ended:", sceneId);
});

// 5. Start a scene by ID
engine.start("intro");

// 6. Advance or make choices
engine.next();
// or, when the current action is a choice:
engine.makeChoice("c_0");
```

**API summary**

| Method / Function   | Description |
|--------------------|-------------|
| `parseKata(content)` | Parses a `.kata` string; returns a `KSONScene`. |
| `new KataEngine(initialCtx)` | Creates an engine with optional initial context (e.g. `{ player: { gold: 0 } }`). |
| `engine.registerScene(scene)` | Registers a parsed scene by `scene.meta.id`. |
| `engine.start(sceneId)` | Starts a scene and emits the first frame. |
| `engine.next()` | Advances to the next action and emits a frame (or `end` if finished). |
| `engine.makeChoice(choiceId)` | Picks a choice by `id`; jumps to `target` scene if present, else advances. |
| `engine.on("update", fn)` | Fired with a `KSONFrame` on each step. |
| `engine.on("end", fn)` | Fired when the current scene runs out of actions. |

---

## The KSON spec

KSON (Kata Serialized Object Notation) is the internal format the engine uses. Your UI should rely only on **frames** and **actions**; you don’t need to parse `.kata` yourself.

### Scene (parser output)

- **meta** — `id`, optional `title`, `layout`, `assets`.
- **script** — Raw `<script>` block content (for future use).
- **actions** — Array of action objects (text, choice, visual, condition, etc.).

### Frame (emitted on each step)

Every `"update"` payload is a **KSONFrame**:

| Field   | Type   | Description |
|--------|--------|-------------|
| `meta` | object | Scene meta (same as in the scene). |
| `action` | object | Current action (see below). |
| `state` | object | Current state: `ctx`, `currentSceneId`, `currentActionIndex`, `history`. |

### Action types

| Type        | Shape | Description |
|------------|--------|-------------|
| `text`     | `{ type: "text", speaker, content }` | Dialogue line; `content` is interpolated (e.g. `\${player.gold}` resolved). |
| `choice`   | `{ type: "choice", choices: [{ id, label, target? }] }` | Branch options; use `makeChoice(id)` to pick. |
| `visual`   | `{ type: "visual", layer, src, effect? }` | Background / media directive. |
| `condition`| `{ type: "condition", condition, then }` | Conditional block; engine evaluates `condition` and either injects `then` or skips. |
| `wait`     | `{ type: "wait", duration }` | Timed pause. |
| `exec`     | `{ type: "exec", code }` | Code execution (e.g. for side effects). |

All logic evaluation uses a restricted context (no `eval`); see the project architecture and `evaluator` for security details.
