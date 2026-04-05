# @kata-framework/test-utils

Test utilities for the Kata narrative engine. Eliminates boilerplate when testing `.kata` scenes — parse, run, and assert in a few lines.

## Install

```bash
bun add -d @kata-framework/test-utils
```

## API

### `createTestEngine(input, ctx?)`

One-liner engine setup from raw `.kata` strings.

```ts
import { createTestEngine } from "@kata-framework/test-utils";

const { engine, frames } = createTestEngine(`
---
id: test
title: Test Scene
---
:: Narrator :: Hello world
`, { player: { gold: 100 } });

engine.start("test");
// frames is a live array — it updates as the engine emits
```

- Accepts a single `.kata` string or an array of strings
- Registers all scenes automatically
- Applies initial context
- Returns `{ engine, frames }` where `frames` is a live array updated on `"update"` events

### `collectFrames(engine, sceneId, options?)`

Auto-advances a scene to completion and returns all emitted frames.

```ts
import { collectFrames } from "@kata-framework/test-utils";

const allFrames = collectFrames(engine, "test");
// allFrames: KSONFrame[]
```

Options:
- `autoPick?: number` — auto-pick choice by index when encountered (default: stops at first choice)
- `maxFrames?: number` — safety limit to prevent infinite loops

### `assertFrame(frame, expected)`

Partial matching on frame fields with readable error messages.

```ts
import { assertFrame } from "@kata-framework/test-utils";

assertFrame(allFrames[0], {
  type: "text",
  speaker: "Narrator",
  content: "Hello world",
});
```

Only checks the fields you provide — no need to match the full frame shape.

### `mockAudioManager()`

Records audio commands for test assertions.

```ts
import { mockAudioManager } from "@kata-framework/test-utils";

const audio = mockAudioManager();
engine.on("audio", audio.handler);

// After engine runs...
expect(audio.commands).toEqual([{ action: "play", id: "bgm" }]);
audio.lastCommand; // most recent command
audio.reset();     // clear recorded commands
```

## Usage with bun:test

```ts
import { expect, test } from "bun:test";
import { createTestEngine, collectFrames, assertFrame } from "@kata-framework/test-utils";

test("intro scene plays through", () => {
  const { engine } = createTestEngine(introKata);
  const frames = collectFrames(engine, "intro");

  expect(frames).toHaveLength(3);
  assertFrame(frames[0], { type: "text", speaker: "Narrator" });
});
```

Depends on `@kata-framework/core` via `workspace:*`.
