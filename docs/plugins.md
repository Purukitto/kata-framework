# Plugin Guide

Kata Framework's plugin system lets you hook into the engine lifecycle to add custom behavior — logging, analytics, content filtering, achievements, and more — without modifying engine internals.

## Quick Start

```ts
import { KataEngine } from "@kata-framework/core";
import type { KataPlugin } from "@kata-framework/core";

const logger: KataPlugin = {
  name: "logger",
  beforeAction(action, ctx) {
    console.log(`[${action.type}]`, action);
    return action; // pass through
  },
};

const engine = new KataEngine();
engine.use(logger);
```

## Plugin Interface

```ts
interface KataPlugin {
  name: string;
  beforeAction?(action: KSONAction, ctx: Record<string, any>): KSONAction | null;
  afterAction?(action: KSONAction, ctx: Record<string, any>): void;
  onChoice?(choice: Choice, ctx: Record<string, any>): void;
  beforeSceneChange?(fromId: string | null, toId: string, ctx: Record<string, any>): void;
}
```

All hooks except `name` are optional — implement only the ones you need.

## Hooks

### `beforeAction(action, ctx) → KSONAction | null`

Called before each frame is emitted to listeners. You can:

- **Pass through** — return the action unchanged
- **Transform** — return a modified copy of the action (e.g., censor text, add metadata)
- **Skip** — return `null` to suppress the frame entirely

```ts
const censor: KataPlugin = {
  name: "profanity-filter",
  beforeAction(action, ctx) {
    if (action.type === "text") {
      return { ...action, content: action.content.replace(/badword/gi, "***") };
    }
    return action;
  },
};
```

### `afterAction(action, ctx)`

Called after the frame has been emitted. Use this for side-effects like analytics, logging, or triggering external systems.

```ts
const analytics: KataPlugin = {
  name: "analytics",
  afterAction(action, ctx) {
    trackEvent("frame_shown", { type: action.type });
  },
};
```

### `onChoice(choice, ctx)`

Called when the player makes a choice, before the choice target is resolved. Useful for tracking player decisions.

```ts
const choiceTracker: KataPlugin = {
  name: "choice-tracker",
  onChoice(choice, ctx) {
    ctx.choiceHistory = ctx.choiceHistory || [];
    ctx.choiceHistory.push(choice.id);
  },
};
```

### `beforeSceneChange(fromId, toId, ctx)`

Called before a scene transition occurs. Useful for cleanup, logging, or gating.

```ts
const sceneLogger: KataPlugin = {
  name: "scene-logger",
  beforeSceneChange(fromId, toId, ctx) {
    console.log(`Transitioning: ${fromId} → ${toId}`);
  },
};
```

## Plugin Execution Order

Plugins execute in registration order. When multiple plugins implement `beforeAction`, the output of one feeds into the next (pipeline). If any plugin returns `null`, the chain stops and the frame is skipped.

```ts
engine.use(pluginA); // runs first
engine.use(pluginB); // receives pluginA's output
engine.use(pluginC); // receives pluginB's output
```

## Managing Plugins

```ts
// Register
engine.use(myPlugin);

// List registered plugin names
engine.getPlugins(); // ["logger", "analytics"]

// Remove by name
engine.removePlugin("logger");
```

- Duplicate names throw an error — each plugin must have a unique name.
- Plugins can be registered before or after `engine.start()`.
- Removing a plugin immediately stops its hooks from firing.

## Example: Achievement System

```ts
const achievements: KataPlugin = {
  name: "achievements",
  afterAction(action, ctx) {
    if (action.type === "text" && ctx.scenesVisited > 10) {
      ctx.achievements = ctx.achievements || [];
      if (!ctx.achievements.includes("explorer")) {
        ctx.achievements.push("explorer");
        console.log("Achievement unlocked: Explorer!");
      }
    }
  },
  beforeSceneChange(fromId, toId, ctx) {
    ctx.scenesVisited = (ctx.scenesVisited || 0) + 1;
  },
};
```

## Example: Debug Plugin

```ts
const debug: KataPlugin = {
  name: "debug",
  beforeAction(action, ctx) {
    console.group(`Frame: ${action.type}`);
    console.log("Action:", action);
    console.log("Context:", ctx);
    console.groupEnd();
    return action;
  },
  onChoice(choice, ctx) {
    console.log(`Player chose: "${choice.label}" (${choice.id})`);
  },
  beforeSceneChange(fromId, toId, ctx) {
    console.log(`Scene: ${fromId ?? "(none)"} → ${toId}`);
  },
};
```

## Notes

- Audio actions (`type: "audio"`) do **not** trigger plugin hooks — they fire the `"audio"` event directly.
- Plugin hooks fire normally during `engine.back()` (undo) — this is intentional so content filters still apply to re-emitted frames.
- Zero overhead when no plugins are registered — the engine skips all hook dispatch.
