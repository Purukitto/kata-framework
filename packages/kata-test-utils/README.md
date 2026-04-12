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

### `StoryTestRunner`

Higher-level harness for **behavioral** tests — describe what the player does instead of asserting on frame indices.

```ts
import { StoryTestRunner } from "@kata-framework/test-utils";

const story = new StoryTestRunner([forestKata, leftKata, rightKata]);

story.start("forest");
story.advanceUntilChoice();
expect(story.currentChoices).toContain("Take the left path");

story.choose("Take the left path");
story.advanceUntilText("You find a stream.");

expect(story.dialogueLog).toContain("You find a stream.");
expect(story.speakerLog).toContain("Narrator");
expect(story.canReach("right", "forest")).toBe(true);
expect(story.ctx.visited_forest).toBe(true);
```

**Methods**

| Method | Behavior |
|--------|----------|
| `start(sceneId)` | Begin playback. |
| `advanceUntilChoice()` | Auto-advance until a choice frame appears or the scene ends. Throws on `maxSteps`. |
| `advanceUntilText(substring)` | Auto-advance until a text frame containing `substring`. Throws if blocked at a choice or never seen. |
| `choose(label)` | Select a choice by label. Throws with the available labels if not found. |
| `canReach(sceneId, fromSceneId?)` | Static graph reachability across all registered scenes. |

**Getters**

`currentFrame`, `currentChoices`, `frames`, `dialogueLog`, `speakerLog`, `ctx`, `isEnded`, `endedScene`.

Constructor accepts a `.kata` source string, an array of strings, or pre-parsed `KSONScene[]`. Optional third arg `{ maxSteps }` (default 1000).

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
