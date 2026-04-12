# @kata-framework/devtools

In-browser developer tools for the Kata Framework — a plugin that records every frame, ctx mutation, plugin hook timing, and engine event, plus an optional React overlay that visualizes them.

Zero production overhead: when `process.env.NODE_ENV === "production"`, the plugin returns a no-op shell that records nothing.

## Install

```bash
bun add -d @kata-framework/devtools
```

## Usage

### Plugin only (headless)

```ts
import { KataEngine } from "@kata-framework/core";
import { devtoolsPlugin } from "@kata-framework/devtools";

const engine = new KataEngine({});
const devtools = devtoolsPlugin();
engine.use(devtools);

engine.start("intro");

devtools.getInspectorState();   // current scene, action, ctx, frame count
devtools.getTimeline();         // every frame in order
devtools.getProfilerReport();   // hook timing per plugin + frame latency
devtools.getEventLog();         // update / end / audio / error events
devtools.evalExpression("hp");  // read-only ctx expression eval
```

### React overlay

```tsx
import { KataDevtools } from "@kata-framework/devtools/react";
import { devtoolsPlugin } from "@kata-framework/devtools";

const devtools = devtoolsPlugin();
engine.use(devtools);

function App() {
  return (
    <>
      <YourGameUI />
      <KataDevtools plugin={devtools} position="bottom-right" />
    </>
  );
}
```

The overlay has tabs for **Inspector**, **Timeline**, **Profiler**, **Console**, and **Events**. It subscribes to plugin updates via `useSyncExternalStore`.

## API

### `devtoolsPlugin(options?)`

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `process.env.NODE_ENV !== "production"` | Force enable/disable. |
| `maxTimelineEntries` | `500` | Older entries are dropped FIFO past this cap. |

Returned plugin methods:

| Method | Returns |
|--------|---------|
| `getInspectorState()` | `{ currentSceneId, currentActionIndex, currentFrame, ctx, pluginNames, frameCount }` |
| `getTimeline()` | `TimelineEntry[]` |
| `getTimelineEntry(index)` | `TimelineEntry \| undefined` |
| `getProfilerReport()` | `{ hooks, slowestPlugin, frameLatency }` |
| `getEventLog()` | `EventLogEntry[]` |
| `subscribe(listener)` | unsubscribe function |
| `evalExpression(expr)` | `{ ok: true, value } \| { ok: false, error }` |
| `reset()` | clears recorded state |

The profiler wraps every other registered plugin's hook methods (both those registered before devtools and those added later) so per-plugin timing and the slowest plugin are tracked automatically.

## License

MIT
