---
"@kata-framework/devtools": minor
---

Initial release of `@kata-framework/devtools` — `devtoolsPlugin()` records full frame timeline, ctx snapshots, per-plugin hook timing, slowest-plugin detection, frame emission latency stats, and an event log. `<KataDevtools>` React overlay (subpath `@kata-framework/devtools/react`) provides Inspector, Timeline, Profiler, Console, and Events tabs. Zero production overhead — `process.env.NODE_ENV === "production"` returns a no-op shell.
