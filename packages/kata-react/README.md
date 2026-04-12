# @kata-framework/react

React 19 bindings for the Kata narrative engine. Wrap your app in `KataProvider`, drive the story with `useKata()`, and render frames with production-ready components: typewriter text, scene transitions, tween animations, and save slot management.

## Install

```bash
bun add @kata-framework/react @kata-framework/core
```

## Quick Start

```tsx
import { KataProvider, useKata, TypewriterText, SceneTransition } from "@kata-framework/react";
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

  return (
    <SceneTransition sceneId={frame.meta.id} transition="fade" duration={500}>
      {frame.action.type === "text" && (
        <div>
          <strong>{frame.action.speaker}:</strong>
          <TypewriterText text={frame.action.content} speed={30} onComplete={actions.next} />
        </div>
      )}
      {frame.action.type === "choice" && (
        <div>
          {frame.action.choices.map((c) => (
            <button key={c.id} onClick={() => actions.makeChoice(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </SceneTransition>
  );
}
```

## API

### `<KataProvider>`

Creates a single `KataEngine` instance and exposes it via context. Includes `TweenProvider` automatically.

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
| `actions.getSnapshot()` | `function` | Get engine snapshot for saving |
| `actions.loadSnapshot(raw)` | `function` | Load a snapshot |

### `useKataEngine()`

Direct access to the `KataEngine` instance from context. Use for advanced operations like `engine.back()`, `engine.use(plugin)`, `engine.getSnapshot()`, etc.

### `<KataDebug />`

Optional debug overlay showing scene ID, current action index, and context state. Drop it anywhere inside `KataProvider` during development.

---

## TypewriterText

Character-by-character text reveal with configurable speed, skip-on-click, and accessibility support.

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | required | Text to reveal |
| `speed` | `number` | `30` | Milliseconds per character |
| `onComplete` | `() => void` | - | Fires once when all text is visible |
| `skip` | `boolean` | `false` | Instantly reveal all text |
| `className` | `string` | - | CSS class for the wrapper span |

- Click to skip: clicking the component instantly reveals all text
- Reduced motion: respects `prefers-reduced-motion` (instant reveal)
- Accessibility: `aria-label` with full text during animation, `aria-live="polite"` after completion
- Changing `text` resets the animation

---

## SceneTransition

Configurable enter/exit transitions between scenes — fade, slide, dissolve — driven by scene ID changes.

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sceneId` | `string` | required | Current scene ID (changes trigger transition) |
| `transition` | `TransitionType` | `"fade"` | Transition style |
| `duration` | `number` | `500` | Transition duration in ms |
| `children` | `ReactNode` | required | Scene content |

- Both old and new content are in the DOM during crossfade
- Reduced motion: respects `prefers-reduced-motion` (instant swap)
- Rapid scene changes: only the latest scene remains after transitions settle

---

## Tween Renderer

Interprets tween frames from the engine and applies CSS transforms/animations to target DOM elements.

```tsx
import { useTween, TweenTarget } from "@kata-framework/react";

function GameScene({ frame }) {
  useTween(frame); // processes tween frames into CSS styles

  return (
    <div>
      <TweenTarget id="stranger">
        <img src="stranger.png" />
      </TweenTarget>
      <TweenTarget id="background" as="section" style={{ width: "100%" }}>
        <img src="bg.jpg" />
      </TweenTarget>
    </div>
  );
}
```

`useTween(frame)` — Call inside a component that receives the current frame. Processes `tween` and `tween-group` actions and pushes CSS styles to `TweenTarget` components via context.

`<TweenTarget>` — Wrapper that receives tween styles for its `id`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | required | Matches `target` field in tween KSON actions |
| `style` | `CSSProperties` | - | Additional inline styles (tween overrides) |
| `className` | `string` | - | CSS class name |
| `as` | `ElementType` | `"div"` | Element type to render |

Property mapping:

| KSON Property | CSS Output |
|---------------|-----------|
| `x` | `translateX(Npx)` |
| `y` | `translateY(Npx)` |
| `opacity` | `opacity: N` |
| `scale` | `scale(N)` |
| `rotation` | `rotate(Ndeg)` |

- `TweenProvider` is included automatically inside `KataProvider`
- Unknown target IDs are silently ignored
- Reduced motion: applies final values instantly with `transition: none`

---

## Save Slot Manager

Complete save/load system with pluggable storage backends and a React hook for reactive slot management.

```tsx
import { SaveManager, useSaveSlots } from "@kata-framework/react";

// Create a manager (outside component)
const saves = new SaveManager({
  storage: "localStorage",     // "localStorage" | custom StorageAdapter
  prefix: "kata-my-game",
  maxSlots: 10,
  autoSaveSlot: 0,             // reserved slot for auto-save
});

function SaveMenu() {
  const { slots, save, load, remove } = useSaveSlots(saves);

  return slots.map(slot => (
    <div key={slot.index}>
      <span>{slot.isAutoSave ? "Auto" : `Slot ${slot.index}`}</span>
      <span>{slot.isEmpty ? "Empty" : slot.sceneName}</span>
      <span>{slot.timestamp && new Date(slot.timestamp).toLocaleString()}</span>
      <button onClick={() => save(slot.index)}>Save</button>
      <button onClick={() => load(slot.index)} disabled={slot.isEmpty}>Load</button>
      <button onClick={() => remove(slot.index)} disabled={slot.isEmpty}>Delete</button>
    </div>
  ));
}
```

### `SaveManager`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `"localStorage" \| StorageAdapter` | `"localStorage"` | Storage backend |
| `prefix` | `string` | `"kata-save"` | Key prefix for storage entries |
| `maxSlots` | `number` | `10` | Maximum save slots |
| `autoSaveSlot` | `number` | - | Reserved slot index for auto-save |

### `useSaveSlots(saveManager, engine?)`

If `engine` is not passed, it reads from `KataProvider` context.

| Return | Type | Description |
|--------|------|-------------|
| `slots` | `SaveSlot[]` | Metadata for all slots |
| `save(index)` | `function` | Save current engine state to slot |
| `load(index)` | `function` | Load snapshot from slot into engine |
| `remove(index)` | `function` | Clear a slot |
| `refresh()` | `function` | Re-read slots from storage |

### Custom Storage Backend

```ts
import type { StorageAdapter } from "@kata-framework/react";

const cloudAdapter: StorageAdapter = {
  getItem(key) { /* fetch from cloud */ },
  setItem(key, value) { /* write to cloud */ },
  removeItem(key) { /* delete from cloud */ },
};

const saves = new SaveManager({ storage: cloudAdapter });
```

---

## Error Boundary

Catches rendering errors in kata-powered React apps and shows a recovery UI instead of a white screen.

```tsx
import { KataErrorBoundary } from "@kata-framework/react";

<KataErrorBoundary
  fallback={({ error, reset, restart, loadLastSave }) => (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try Again</button>
      <button onClick={() => restart("intro")}>Restart</button>
      <button onClick={loadLastSave}>Load Last Save</button>
    </div>
  )}
  onError={(error, info) => console.error(error)}
  saveManager={saves}  // optional, enables loadLastSave
>
  <Game />
</KataErrorBoundary>
```

| Prop | Type | Description |
|------|------|-------------|
| `fallback` | `(props) => ReactNode` | Render function for error UI |
| `onError` | `(error, errorInfo) => void` | Callback when error is caught |
| `engine` | `KataEngine` | Optional engine override (defaults to context) |
| `saveManager` | `SaveManager` | Optional, enables `loadLastSave` recovery |

Recovery actions passed to `fallback`:

| Action | Description |
|--------|-------------|
| `reset()` | Clear error and re-mount children |
| `restart(sceneId?)` | Call `engine.start()` on the given or current scene, then reset |
| `loadLastSave()` | Load the most recent save slot via `SaveManager`, returns `boolean` |

---

## Accessibility Hooks

```tsx
import { useReducedMotion, useKeyboardNavigation, useFocusManagement } from "@kata-framework/react";

// Track prefers-reduced-motion media query
const prefersReduced = useReducedMotion();

// Arrow key + Enter navigation for choices
const { focusedIndex, onKeyDown } = useKeyboardNavigation(choices, (choiceId) => actions.makeChoice(choiceId));

// Auto-focus an element when a dependency changes
const ref = useFocusManagement(frame);
```

`KataDebug` includes ARIA attributes (`role="dialog"`, `aria-live="assertive"`, `aria-label`) for accessible debug output.

---

## Multiplayer

```tsx
import { useKataMultiplayer, KataMultiplayerProvider } from "@kata-framework/react";
```

See `@kata-framework/sync` for multiplayer setup. The React hook returns `{ frame, state, players, isAuthority, connectionState, actions }`.

---

## Architecture

- `KataProvider` — creates engine + TweenProvider via `useRef`, exposes via context
- `useKata()` — `useSyncExternalStore` subscription to engine events
- `TypewriterText` — `requestAnimationFrame` character reveal with a11y
- `SceneTransition` — dual-container CSS transitions with lifecycle management
- `TweenContext` + `useTween` + `TweenTarget` — context-based tween style distribution
- `SaveManager` — storage-agnostic save/load with `StorageAdapter` interface
- `useSaveSlots` — reactive hook wrapping SaveManager
- `KataErrorBoundary` — class component error boundary with engine/save recovery

Depends on `@kata-framework/core` via `workspace:*`. Peer dependency on React 19.
