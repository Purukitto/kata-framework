# Plugin Authoring Guide

Kata Framework's plugin system lets you hook into the engine lifecycle to add custom behavior — logging, analytics, content filtering, auto-saving, content warnings, and more — without modifying engine internals.

## Quick Start

```ts
import { KataEngine } from "@kata-framework/core";
import type { KataPlugin } from "@kata-framework/core";

const myPlugin: KataPlugin = {
  name: "my-plugin",
  beforeAction(action, ctx) {
    console.log(`[${action.type}]`, action);
    return action; // pass through
  },
};

const engine = new KataEngine();
engine.use(myPlugin);
```

That's a complete plugin. Register it with `engine.use()`, and the engine calls your hooks at the appropriate lifecycle points.

## The KataPlugin Interface

```ts
interface KataPlugin {
  name: string;
  init?(engine: any): void;
  beforeAction?(action: KSONAction, ctx: Record<string, any>): KSONAction | null;
  afterAction?(action: KSONAction, ctx: Record<string, any>): void;
  onChoice?(choice: Choice, ctx: Record<string, any>): void;
  beforeSceneChange?(fromId: string | null, toId: string, ctx: Record<string, any>): void;
  onEnd?(sceneId: string): void;
}
```

All hooks except `name` are optional — implement only the ones you need.

### `init(engine)`

Called once when the plugin is registered via `engine.use()`. Use this to capture a reference to the engine for later use (e.g., calling `engine.getSnapshot()`).

### `beforeAction(action, ctx) → KSONAction | null`

Called before each frame is emitted. You can:
- **Pass through** — return the action unchanged
- **Transform** — return a modified copy (e.g., censor text)
- **Skip** — return `null` to suppress the frame entirely

### `afterAction(action, ctx)`

Called after the frame has been emitted. Use for side-effects like analytics or logging.

### `onChoice(choice, ctx)`

Called when the player makes a choice, before the target is resolved.

### `beforeSceneChange(fromId, toId, ctx)`

Called before a scene transition occurs. `fromId` is `null` on the initial `start()` call.

### `onEnd(sceneId)`

Called when a scene reaches its last action. Use for cleanup or tracking completion.

## Plugin Execution Order

Plugins execute in registration order. `beforeAction` forms a pipeline — each plugin receives the previous one's output. If any returns `null`, the chain stops and the frame is skipped.

```ts
engine.use(pluginA); // runs first
engine.use(pluginB); // receives pluginA's output
```

## State Management Patterns

### Closure Pattern (recommended for most plugins)

State lives in the factory function's closure. This is the pattern used by all official plugins.

```ts
export function myPlugin(config: MyConfig): MyPlugin {
  // Private state in closure
  const data: string[] = [];

  return {
    name: "my-plugin",
    afterAction(action, ctx) {
      data.push(action.type);
    },
    // Custom API
    getData() { return [...data]; },
    reset() { data.length = 0; },
  };
}
```

### Class Pattern

Use classes when you need inheritance or complex internal structure.

```ts
class MyPlugin implements KataPlugin {
  name = "my-plugin";
  private data: string[] = [];

  afterAction(action: KSONAction, ctx: Record<string, any>) {
    this.data.push(action.type);
  }

  getData() { return [...this.data]; }
}
```

## Exposing a Custom API

Extend the `KataPlugin` interface and use `engine.getPlugin<T>(name)` for typed access:

```ts
export interface MyPlugin extends KataPlugin {
  getData(): string[];
  reset(): void;
}

// Consumer code:
const plugin = engine.getPlugin<MyPlugin>("my-plugin");
plugin?.getData();
```

## Testing Plugins

Use `@kata-framework/test-utils` for fast, declarative tests:

```ts
import { expect, test } from "bun:test";
import { createTestEngine } from "@kata-framework/test-utils";
import { myPlugin } from "./my-plugin";

test("plugin tracks actions", () => {
  const plugin = myPlugin();
  const { engine, frames } = createTestEngine(`
    ---
    id: test
    ---
    :: A :: Hello
    :: B :: World
  `);
  engine.use(plugin);
  engine.start("test");
  engine.next();

  expect(plugin.getData()).toHaveLength(2);
});
```

Or test directly with `KataEngine`:

```ts
import { KataEngine } from "@kata-framework/core";

function makeScene(id, actions) {
  return { meta: { id }, script: "", actions };
}

test("beforeAction transforms text", () => {
  const scene = makeScene("s1", [
    { type: "text", speaker: "A", content: "Hello" },
  ]);
  const engine = new KataEngine();
  engine.use(myPlugin());
  engine.registerScene(scene);

  const frames = [];
  engine.on("update", (f) => frames.push(f));
  engine.start("s1");

  expect(frames[0].action.content).toBe("transformed");
});
```

## Publishing

### Naming Convention

Third-party plugins should use the `kata-plugin-` prefix:

```
kata-plugin-achievements
kata-plugin-telemetry
kata-plugin-save-to-cloud
```

### package.json Setup

```json
{
  "name": "kata-plugin-my-feature",
  "peerDependencies": {
    "@kata-framework/core": "^0.5.0"
  }
}
```

### Scaffolding

Use the official scaffolder to bootstrap a new plugin project:

```bash
bun create kata-plugin my-feature
cd kata-plugin-my-feature
bun install
bun test
```

## Subpath Exports

Official plugins shipped with `@kata-framework/core` use subpath exports for tree-shaking:

```ts
// Core engine — zero plugin code included
import { KataEngine } from "@kata-framework/core";

// Each plugin is a separate import
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";
import { loggerPlugin } from "@kata-framework/core/plugins/logger";
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";
```

Third-party multi-plugin packages can adopt the same pattern using `package.json` `"exports"` with multiple entry points.

## Official Plugins Reference

| Plugin | Import | Hooks Used |
|--------|--------|------------|
| [Analytics](../packages/kata-core/src/plugins/analytics.ts) | `@kata-framework/core/plugins/analytics` | `beforeSceneChange`, `afterAction`, `onChoice`, `onEnd` |
| [Profanity Filter](../packages/kata-core/src/plugins/profanity.ts) | `@kata-framework/core/plugins/profanity` | `beforeAction` |
| [Auto-Save](../packages/kata-core/src/plugins/auto-save.ts) | `@kata-framework/core/plugins/auto-save` | `init`, `beforeSceneChange`, `onChoice`, `afterAction` |
| [Debug Logger](../packages/kata-core/src/plugins/logger.ts) | `@kata-framework/core/plugins/logger` | All 5 hooks |
| [Content Warnings](../packages/kata-core/src/plugins/content-warnings.ts) | `@kata-framework/core/plugins/content-warnings` | `beforeSceneChange` |

## Validation

The engine validates plugins on registration. Invalid plugins throw with a descriptive error:

```ts
import { validatePlugin } from "@kata-framework/core/plugins/validate";

const result = validatePlugin(myPlugin);
// { valid: true } or { valid: false, errors: ["Missing 'name' property"], warnings: [] }
```

`engine.use()` calls `validatePlugin` internally — you get clear errors instead of silent failures.

## Notes

- Audio actions (`type: "audio"`) do **not** trigger `beforeAction`/`afterAction` — they fire the `"audio"` event directly.
- Tween actions are fire-and-forget: `beforeAction`/`afterAction` fire, then the engine auto-advances.
- Plugin hooks fire normally during `engine.back()` (undo) — content filters still apply to re-emitted frames.
- Zero overhead when no plugins are registered — the engine skips all hook dispatch.
