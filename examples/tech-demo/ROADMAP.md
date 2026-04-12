# The Last Broadcast — Tech Demo Roadmap

> This demo evolves alongside the kata-framework, exercising every feature through a cohesive interactive narrative.

Current phase: **COMPLETE** — All 6 phases delivered

---

## Phase 1 — Foundation: Core Story Loop `v0.1.0` COMPLETE

> Runnable single-player demo with basic narrative, choices, and the React shell.

- [x] `.kata` file format (YAML frontmatter, narrative body, comments)
- [x] Text actions (`:: Speaker :: dialogue`)
- [x] Choice branching (`* [Label] -> @scene/id`)
- [x] Scene metadata (id, title)
- [x] Engine lifecycle (`start`, `next`, `makeChoice`)
- [x] `KataProvider` + `useKata` (React bindings)
- [x] Basic tests: `createTestEngine`, `collectFrames`, `assertFrame`

---

## Phase 2 — Rich Narrative: State, Conditions, and Directives `v0.2.0` COMPLETE

> Stateful, reactive narrative with variables, conditionals, undo, and save/load.

- [x] `[exec]` directives (variable mutations — `ctx.intel++`, `ctx.listeners += 200`)
- [x] Variable interpolation (`${ctx.listeners} listeners tuning in`)
- [x] Conditional blocks (`:::if{cond="ctx.intel >= 3"} ... :::elseif ... :::else ... :::`)
- [x] Conditional choices (choice lists gated by `:::if` blocks)
- [x] `[wait]` directives (dramatic pauses — radio static, tension beats)
- [x] `[bg]` visual directives (studio-night, rooftop-rain, signal-tower backgrounds)
- [x] Undo/rewind (`engine.back()` — "Rewind the tape")
- [x] Save/load snapshots (localStorage persistence with slot management)
- [x] **Framework fix:** Added exec action runtime execution to `KataEngine` (fire-and-forget with `structuredClone` for Immer compatibility)

---

## Phase 3 — Production Polish: Animations, Audio, Plugins, and A11y `v0.3.0` COMPLETE

- [x] Tween animations (`[tween]` directives in expose + signal-tower scenes)
- [x] Tween groups (parallel + sequence in signal-tower scene)
- [x] Audio actions (programmatic KSON audio events with `mockAudioManager`)
- [x] All 5 built-in plugins (analytics, profanity, auto-save, logger, content-warnings)
- [x] Custom `listener-count` plugin (closure factory, tracks growth/peak/history)
- [x] Accessibility (`useReducedMotion`, `useKeyboardNavigation`, `useFocusManagement`, ARIA roles)
- [x] Premium dark radio-studio UI (CRT scanlines, signal meter, alert light, IBM Plex fonts)
- [x] Content warning overlay (full-screen interstitial before exposé)
- [x] Analytics dashboard (scene visits, choice stats, drop-off points)
- [x] Debug panel (frame inspector, ctx JSON, plugin list, log entries)
- [x] 31 tests across 7 files, 450 total monorepo tests passing

---

## Phase 4 — Internationalization and Modding `v0.4.0` COMPLETE

- [x] Locale files: 8 YAML files across es (Spanish) and ja (Japanese) for 4 key scenes
- [x] Runtime locale switching via `engine.setLocale()` with LocaleSwitcher component
- [x] `parseLocaleYaml` integration — all locale files parse and register correctly
- [x] `mergeScene()` — mod patches booth scene to add new dialogue line + updated title
- [x] Mod system: `alternate-caller` mod with manifest.json, caller_ray.kata scene, booth.patch.json
- [x] ModManager component with toggle UI for enabling/disabling mods
- [x] AssetRegistry — auto-registers visual assets from all scenes, per-scene and aggregated lookups
- [x] SceneGraph — connectivity analysis, reachable set, orphan/dead-end detection, DOT/JSON export
- [x] Preloading via `getPreloadSet()` — 1-hop asset preloading from current scene
- [x] SceneGraphView component — interactive node list with connections and current-scene highlight
- [x] 52 tests across 10 files, 471 total monorepo tests passing

---

## Phase 5 — Multiplayer: Co-op Broadcast `v0.5.0` COMPLETE

- [x] `KataSyncManager` integration with `MockTransport` for testing
- [x] Host/follower authority model — first player becomes authority
- [x] Frame broadcasting from host to follower via transport
- [x] Choice policies: first-writer (routine), vote (editorial), designated (host-only)
- [x] Multiplayer scene frontmatter (`multiplayer.choicePolicy`, `multiplayer.syncPoint`)
- [x] MultiplayerLobby component (room join, room name input)
- [x] PlayerPresenceBar component (connection status, player list, host badge)
- [x] Solo/Co-op mode toggle on start screen
- [x] `@kata-framework/sync` added as workspace dependency
- [x] 61 tests across 11 files, 480 total monorepo tests passing

---

## Phase 6 — Integration Showcase `v0.6.0` COMPLETE

- [x] Feature Explorer overlay — 38 framework features with category/phase filters
- [x] Full regression test suite — 3 complete playthroughs hitting shutdown, liberation, and underground endings
- [x] Cross-cutting verification — distinct endings, ctx evolution tracking across scenes
- [x] Comprehensive README with architecture diagram, project structure, all features documented
- [x] **Framework fix:** Fixed `${ctx.X}` → `${X}` and `cond="ctx.X"` → `cond="X"` across all scenes (evaluator destructures ctx, doesn't wrap it)
- [x] 66 tests across 12 files, 485 total monorepo tests passing
