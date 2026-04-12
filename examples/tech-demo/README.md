# The Last Broadcast — Kata Framework Tech Demo

A flagship tech demo for the [kata-framework](https://github.com/purukitto/kata-framework). Play as "the Operator" running a pirate radio station during a media blackout — manage broadcasts, handle callers, evade authorities, and make editorial decisions that shape the story.

This demo exercises **every feature** of the kata-framework across a cohesive interactive narrative with 11 scenes, 3 endings, and 38+ framework features demonstrated.

## Getting Started

```bash
# From the monorepo root
bun install

# Run the demo
cd examples/tech-demo
bun run dev

# Run tests (66 tests across 12 files)
bun test
```

## Features Demonstrated

### Core Engine (Phase 1-2)
- `.kata` file format with YAML frontmatter, text actions, choices, comments
- `[exec]` directives for state mutations (`ctx.intel++`, `ctx.listeners += 200`)
- Variable interpolation (`${listeners} people tuning in`)
- Conditional blocks (`:::if/elseif/else` branching based on state)
- `[wait]` and `[bg]` directives for pacing and visuals
- Undo/rewind (`engine.back()`) and save/load snapshots

### Plugins & Polish (Phase 3)
- All 5 built-in plugins: analytics, profanity filter, auto-save, logger, content-warnings
- Custom `listener-count` plugin (closure factory pattern)
- Tween animations and tween groups (parallel/sequence)
- Audio events with `mockAudioManager` testing
- Accessibility: `useReducedMotion`, `useKeyboardNavigation`, `useFocusManagement`, ARIA roles
- Premium dark radio-studio UI with CRT scanlines, signal meter, alert light

### Internationalization & Modding (Phase 4)
- Locale files (8 YAML files) for Spanish and Japanese translations
- Runtime locale switching via `engine.setLocale()` + LocaleSwitcher component
- Mod system: `alternate-caller` mod with manifest, new scene, and scene patch
- `mergeScene()` for RFC 7396-style scene patching
- `AssetRegistry` and `SceneGraph` for asset tracking and connectivity analysis
- Preloading via `getPreloadSet()` — 1-hop asset preloading

### Multiplayer (Phase 5)
- `KataSyncManager` with MockTransport for testing
- Host-authoritative model with automatic authority assignment
- Choice policies in scene frontmatter (first-writer, vote, designated)
- MultiplayerLobby and PlayerPresenceBar components
- Solo/Co-op mode toggle

### Integration (Phase 6)
- Feature Explorer overlay — browse all 38 features with category/phase filters
- Full regression test suite — 3 complete playthroughs hitting all 3 endings
- Test utilities: `createTestEngine`, `collectFrames`, `assertFrame`, `mockAudioManager`

## Project Structure

```
tech-demo/
  scenes/                  # .kata scene files (11 scenes)
    prologue.kata          # Opening: the blackout begins
    studio/                # Broadcast studio scenes
      booth.kata           # Hub: decide what to broadcast
      first-broadcast.kata # Go live — take callers
      caller-maria.kata    # Street reporter (intel + trust)
      caller-vex.kata      # Informant (high intel, high risk)
      caller-hale.kata     # Authority confrontation
      editorial-choice.kata# Major editorial decision
      expose.kata          # Content-warned exposé (tweens)
    rooftop/
      signal-tower.kata    # Boost signal (tween groups)
    endings/
      shutdown.kata        # Bad ending: go dark
      liberation.kata      # Good ending: signal rises
      underground.kata     # Neutral ending: go underground
  locales/                 # i18n locale overrides
    es/                    # Spanish translations (4 scenes)
    ja/                    # Japanese translations (4 scenes)
  mods/                    # Mod content
    alternate-caller/      # Sample mod: adds Ray the Engineer
      manifest.json        # Mod manifest
      scenes/              # New scene files
      patches/             # Scene patches (booth.patch.json)
  src/                     # React 19 application
    App.tsx                # Main shell with all panels
    engine.ts              # Engine setup, plugins, locale/asset/mod loading
    client.tsx             # Client hydration entry
    index.tsx              # Bun.serve SSR server
    plugins/
      listener-count.ts    # Custom plugin (closure factory)
    components/
      StudioView.tsx       # Main narrative controller
      DialogueBox.tsx      # Speaker-attributed dialogue
      ChoicePanel.tsx       # Keyboard-navigable choices
      BackgroundLayer.tsx   # Visual layer
      SaveLoadMenu.tsx     # 3-slot save/load
      SignalMeter.tsx       # Animated signal bar
      AlertLight.tsx        # Suspicion indicator
      ContentWarningOverlay.tsx
      AnalyticsDashboard.tsx
      DebugPanel.tsx
      LocaleSwitcher.tsx
      ModManager.tsx
      SceneGraphView.tsx
      PlayerPresenceBar.tsx
      MultiplayerLobby.tsx
      FeatureExplorer.tsx  # 38-feature showcase overlay
    styles/
      global.css           # Theme, fonts, animations
      studio.css           # Layout, CRT effects
      components.css       # All component styles
  tests/                   # 66 tests across 12 files
    scenes/                # Scene parsing and branching
    engine/                # Save/load, undo, audio, locale, modding, assets
    plugins/               # Plugin integration
    multiplayer/           # Sync manager tests
    regression/            # Full 3-ending playthroughs
```

## The Story

The government has imposed a total media blackout. You and your co-host Reva run the last independent radio station — broadcasting from a hidden studio, dodging the authorities, and deciding what the people deserve to hear.

**Three paths, three endings:**
- **Shutdown** — sign off and go dark (quick exit)
- **Liberation** — build audience and broadcast the truth (via Maria)
- **Underground** — gather intel and go underground (via Vex)

Every choice matters. Every broadcast reaches someone. The question is: what are you willing to risk to keep the signal alive?

## Architecture

```
.kata files ─→ parseKata() ─→ KSONScene ─→ engine.registerScene()
                                              │
                         engine.start() ──────┘
                              │
                    ┌─────────▼──────────┐
                    │   KataEngine       │
                    │ ┌───────────────┐  │
                    │ │ Plugin System │  │◄── 6 plugins
                    │ └───────────────┘  │
                    │ ┌───────────────┐  │
                    │ │ Zustand Store │  │◄── ctx, scene, history
                    │ └───────────────┘  │
                    │ ┌───────────────┐  │
                    │ │ LocaleManager │  │◄── es/ja overrides
                    │ └───────────────┘  │
                    └────────┬───────────┘
                             │ emits KSONFrame
                    ┌────────▼───────────┐
                    │  React (useKata)   │
                    │ KataProvider       │
                    │ StudioShell UI     │
                    └────────────────────┘
```
