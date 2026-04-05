# @kata-framework/react

React 19 bindings for the Kata narrative engine. Wrap your app in `KataProvider`, drive the story with `useKata()`, and render frames with your own components.

## Install

```bash
bun add @kata-framework/react @kata-framework/core
```

## Quick Start

```tsx
import { KataProvider, useKata } from "@kata-framework/react";
import { parseKata } from "@kata-framework/core";

const scenes = [parseKata(introSource), parseKata(shopSource)];

function App() {
  return (
    <KataProvider config={{ player: { name: "Hero", gold: 100 } }} initialScenes={scenes}>
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
          <button key={c.id} onClick={() => actions.makeChoice(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  return <button onClick={actions.next}>Next</button>;
}
```

## API

### `<KataProvider>`

Creates a single `KataEngine` instance and exposes it via context.

| Prop | Type | Description |
|------|------|-------------|
| `config` | `Record<string, any>` | Initial engine context (`ctx`) |
| `initialScenes` | `KSONScene[]` | Scenes to register on mount |
| `options` | `KataEngineOptions` | Engine options (e.g. `{ historyDepth: 100 }`) |

### `useKata()`

Subscribe to engine events via `useSyncExternalStore`. Returns:

| Field | Type | Description |
|-------|------|-------------|
| `frame` | `KSONFrame \| null` | Current frame (null before first update) |
| `state` | `object \| null` | Current `frame.state` shortcut |
| `actions.start(id)` | `function` | Start a scene |
| `actions.next()` | `function` | Advance to next action |
| `actions.makeChoice(id)` | `function` | Pick a choice |

### `useKataEngine()`

Direct access to the `KataEngine` instance from context. Use for advanced operations like `engine.back()`, `engine.use(plugin)`, `engine.getSnapshot()`, etc.

### `<KataDebug />`

Optional debug overlay showing scene ID, current action index, and context state. Drop it anywhere inside `KataProvider` during development.

## Architecture

- `KataProvider` (`src/context.tsx`) — creates engine via `useRef`, exposes via React context
- `useKata()` (`src/useKata.ts`) — `useSyncExternalStore` subscription to engine events
- `KataDebug` (`src/KataDebug.tsx`) — debug overlay component

### Accessibility Hooks

```tsx
import { useReducedMotion, useKeyboardNavigation, useFocusManagement } from "@kata-framework/react";

// Track prefers-reduced-motion media query
const prefersReduced = useReducedMotion();

// Arrow key + Enter navigation for choices
useKeyboardNavigation(choices, (choiceId) => actions.makeChoice(choiceId));

// Auto-focus an element when a dependency changes
const ref = useFocusManagement(frame);
```

`KataDebug` includes ARIA attributes (`role="dialog"`, `aria-live="assertive"`, `aria-label`) for accessible debug output.

Depends on `@kata-framework/core` via `workspace:*`. Peer dependency on React 19.
