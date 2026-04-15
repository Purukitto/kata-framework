# @kata-framework/devtools

## 1.0.0

### Major Changes

- ff1d22d: Stable v1.0.0 release. `devtoolsPlugin()`, the plugin's public inspector/timeline/profiler/events API, and the `<KataDevtools />` React overlay at the `@kata-framework/devtools/react` subpath are now frozen. Future breaking changes require a new major version.

### Patch Changes

- Updated dependencies [ff1d22d]
  - @kata-framework/core@1.0.0

## 0.2.0

### Minor Changes

- 5b1fc30: Initial release of `@kata-framework/devtools` — `devtoolsPlugin()` records full frame timeline, ctx snapshots, per-plugin hook timing, slowest-plugin detection, frame emission latency stats, and an event log. `<KataDevtools>` React overlay (subpath `@kata-framework/devtools/react`) provides Inspector, Timeline, Profiler, Console, and Events tabs. Zero production overhead — `process.env.NODE_ENV === "production"` returns a no-op shell.
