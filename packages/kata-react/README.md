# @kata/react

React bindings for Kata: wrap your app in **KataProvider**, drive narrative with the **useKata()** hook, and render frames with your own UI.

---

## Usage

### 1. Wrap the app with KataProvider

Pass an optional `config` object as the initial engine context (e.g. player state). The provider creates a single **KataEngine** and exposes it to the tree.

```tsx
import { KataProvider } from "kata-react";
import { parseKata } from "kata-core/src/parser/index";

const introScene = parseKata(`
---
id: intro
---
:: Narrator ::
Welcome. You have \${player.gold} gold.
* [Start] -> @intro
`);

function App() {
  return (
    <KataProvider config={{ player: { gold: 100 } }}>
      <Game />
    </KataProvider>
  );
}
```

### 2. Register scenes and use the hook

Scenes must be registered on the engine before calling `start(id)`. You can do that in a component that has access to the engine (e.g. via `useKataEngine()`), or in a small bootstrap effect. Then use **useKata()** to get the current frame, state, and actions.

```tsx
import { useKata, useKataEngine } from "kata-react";
import { parseKata } from "kata-core/src/parser/index";
import { useEffect } from "react";

const introScene = parseKata(/* ... */);

function Game() {
  const engine = useKataEngine();
  const { frame, state, actions } = useKata();

  useEffect(() => {
    engine.registerScene(introScene);
    actions.start("intro");
  }, [engine]);

  // ...
}
```

### 3. Render from frame and actions

`frame` is the current **KSONFrame** (or `null` before the first update). `state` is `frame?.state ?? null`. Use `actions.next()`, `actions.start(id)`, and `actions.makeChoice(id)` to drive the story.

---

## Example: custom UI component

```tsx
import { useKata } from "kata-react";

function NarrativeUI() {
  const { frame, state, actions } = useKata();

  if (!frame) {
    return <p>Loading…</p>;
  }

  const { action } = frame;

  if (action.type === "text") {
    return (
      <div className="dialogue">
        <span className="speaker">{action.speaker}</span>
        <p>{action.content}</p>
        <button onClick={() => actions.next()}>Next</button>
      </div>
    );
  }

  if (action.type === "choice") {
    return (
      <div className="choices">
        {action.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => actions.makeChoice(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  return <button onClick={() => actions.next()}>Next</button>;
}
```

This component subscribes to the engine via `useKata()`, shows the current dialogue or choices, and advances or branches with `actions.next()` and `actions.makeChoice(id)`. You can replace the markup and styles with your own design; the hook contract stays the same.

For a ready-made debug panel (scene ID, current action, state), use the **KataDebug** component from `kata-react` where appropriate.
