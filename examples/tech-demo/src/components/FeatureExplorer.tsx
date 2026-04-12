import { useState } from "react";

interface Feature {
  category: string;
  name: string;
  description: string;
  source: string;
  phase: number;
}

const FEATURES: Feature[] = [
  // Phase 1 — Foundation
  { category: "Core", name: ".kata File Format", description: "YAML frontmatter + markdown narrative body with directives", source: "scenes/prologue.kata", phase: 1 },
  { category: "Core", name: "Text Actions", description: ":: Speaker :: dialogue — renders as speaker-attributed text frames", source: "scenes/studio/booth.kata", phase: 1 },
  { category: "Core", name: "Choice Branching", description: "* [Label] -> @target — player-driven scene navigation", source: "scenes/studio/first-broadcast.kata", phase: 1 },
  { category: "React", name: "KataProvider + useKata", description: "React 19 context provider and useSyncExternalStore hook", source: "src/App.tsx", phase: 1 },

  // Phase 2 — Rich Narrative
  { category: "Core", name: "[exec] Directives", description: "Inline code execution: ctx.intel++, ctx.listeners += 200", source: "scenes/prologue.kata", phase: 2 },
  { category: "Core", name: "Variable Interpolation", description: "${ctx.listeners} — runtime string interpolation in text", source: "scenes/studio/booth.kata", phase: 2 },
  { category: "Core", name: "Conditional Blocks", description: ":::if/elseif/else — branching narrative based on state", source: "scenes/studio/editorial-choice.kata", phase: 2 },
  { category: "Core", name: "[wait] Directives", description: "Timed pauses for dramatic effect — [wait 1500]", source: "scenes/prologue.kata", phase: 2 },
  { category: "Core", name: "[bg] Visual Directives", description: "Background layer changes — [bg src=\"studio-night.jpg\"]", source: "scenes/studio/booth.kata", phase: 2 },
  { category: "Core", name: "Undo / Rewind", description: "engine.back() — step backward through action history", source: "src/components/StudioView.tsx", phase: 2 },
  { category: "Core", name: "Save / Load Snapshots", description: "getSnapshot() / loadSnapshot() with localStorage slots", source: "src/components/SaveLoadMenu.tsx", phase: 2 },

  // Phase 3 — Production Polish
  { category: "Core", name: "Tween Animations", description: "[tween target property to duration easing] — fire-and-forget", source: "scenes/studio/expose.kata", phase: 3 },
  { category: "Core", name: "Tween Groups", description: "[tween-group parallel/sequence] — coordinated animations", source: "scenes/rooftop/signal-tower.kata", phase: 3 },
  { category: "Plugin", name: "Analytics Plugin", description: "Tracks scene visits, choice selections, drop-off points", source: "src/engine.ts", phase: 3 },
  { category: "Plugin", name: "Profanity Filter", description: "Censors text/choice labels with configurable word lists", source: "src/engine.ts", phase: 3 },
  { category: "Plugin", name: "Auto-Save", description: "Automatic snapshots on choices, scene changes, or intervals", source: "src/engine.ts", phase: 3 },
  { category: "Plugin", name: "Logger", description: "Structured lifecycle logging with quiet/normal/verbose levels", source: "src/engine.ts", phase: 3 },
  { category: "Plugin", name: "Content Warnings", description: "Tag scenes with warning labels, fire callbacks before entry", source: "src/engine.ts", phase: 3 },
  { category: "Plugin", name: "Custom Plugin (listener-count)", description: "Closure factory pattern — tracks listener growth/peak/history", source: "src/plugins/listener-count.ts", phase: 3 },
  { category: "A11y", name: "useReducedMotion", description: "Respects prefers-reduced-motion for wait/animation durations", source: "src/components/StudioView.tsx", phase: 3 },
  { category: "A11y", name: "useKeyboardNavigation", description: "Arrow keys, Enter, number keys for choice selection", source: "src/components/ChoicePanel.tsx", phase: 3 },
  { category: "A11y", name: "useFocusManagement", description: "Auto-focus management for dialogue flow", source: "src/components/DialogueBox.tsx", phase: 3 },
  { category: "UI", name: "KataDebug / Debug Panel", description: "Frame inspector, ctx JSON viewer, plugin list, log entries", source: "src/components/DebugPanel.tsx", phase: 3 },

  // Phase 4 — i18n & Modding
  { category: "i18n", name: "Locale Files (YAML)", description: "Per-scene text overrides for Spanish (es) and Japanese (ja)", source: "locales/es/prologue.yaml", phase: 4 },
  { category: "i18n", name: "Runtime Locale Switching", description: "engine.setLocale() — switch language without restart", source: "src/components/LocaleSwitcher.tsx", phase: 4 },
  { category: "Modding", name: "mergeScene()", description: "RFC 7396-style scene patching — insert, replace, remove actions", source: "mods/alternate-caller/patches/booth.patch.json", phase: 4 },
  { category: "Modding", name: "Mod System", description: "Manifest + scenes + patches — modular content injection", source: "mods/alternate-caller/manifest.json", phase: 4 },
  { category: "Assets", name: "AssetRegistry", description: "ID-to-URL mapping, per-scene asset tracking", source: "src/engine.ts", phase: 4 },
  { category: "Assets", name: "SceneGraph", description: "Connectivity analysis, orphan/dead-end detection, DOT export", source: "src/components/SceneGraphView.tsx", phase: 4 },
  { category: "Assets", name: "Preloading", description: "getPreloadSet() — 1-hop asset preloading from current scene", source: "src/engine.ts", phase: 4 },

  // Phase 5 — Multiplayer
  { category: "Multiplayer", name: "KataSyncManager", description: "Host-authoritative sync — wraps engine for multiplayer", source: "tests/multiplayer/sync.test.ts", phase: 5 },
  { category: "Multiplayer", name: "MockTransport", description: "In-process transport for testing multiplayer without network", source: "tests/multiplayer/sync.test.ts", phase: 5 },
  { category: "Multiplayer", name: "Choice Policies", description: "first-writer, vote, designated — per-scene via frontmatter", source: "scenes/studio/editorial-choice.kata", phase: 5 },
  { category: "Multiplayer", name: "Player Presence", description: "Authority model, player roster, connection state tracking", source: "src/components/PlayerPresenceBar.tsx", phase: 5 },

  // Phase 6 — Integration
  { category: "Testing", name: "createTestEngine", description: "Parse .kata strings, register scenes, collect frames", source: "tests/scenes/prologue.test.ts", phase: 6 },
  { category: "Testing", name: "collectFrames", description: "Auto-advance until end/choice with autoPick and maxFrames", source: "tests/scenes/branching.test.ts", phase: 6 },
  { category: "Testing", name: "assertFrame", description: "Partial matching on action/state with readable errors", source: "tests/scenes/prologue.test.ts", phase: 6 },
  { category: "Testing", name: "mockAudioManager", description: "Track audio commands with handler, commands, lastCommand, reset", source: "tests/engine/audio.test.ts", phase: 6 },
];

const CATEGORIES = [...new Set(FEATURES.map((f) => f.category))];

interface FeatureExplorerProps {
  onClose: () => void;
}

export function FeatureExplorer({ onClose }: FeatureExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  const filtered = FEATURES.filter((f) => {
    if (selectedCategory && f.category !== selectedCategory) return false;
    if (selectedPhase && f.phase !== selectedPhase) return false;
    return true;
  });

  return (
    <div className="feature-explorer" role="dialog" aria-label="Feature Explorer">
      <div className="feature-explorer__backdrop" onClick={onClose} />
      <div className="feature-explorer__panel">
        <div className="feature-explorer__header">
          <div>
            <h2 className="feature-explorer__title">Feature Explorer</h2>
            <p className="feature-explorer__subtitle">
              {FEATURES.length} framework features demonstrated across 6 phases
            </p>
          </div>
          <button className="feature-explorer__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Filters */}
        <div className="feature-explorer__filters">
          <div className="feature-explorer__filter-group">
            <span className="feature-explorer__filter-label">Category</span>
            <div className="feature-explorer__filter-btns">
              <button
                className={`feature-explorer__filter-btn ${selectedCategory === null ? "feature-explorer__filter-btn--active" : ""}`}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`feature-explorer__filter-btn ${selectedCategory === c ? "feature-explorer__filter-btn--active" : ""}`}
                  onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="feature-explorer__filter-group">
            <span className="feature-explorer__filter-label">Phase</span>
            <div className="feature-explorer__filter-btns">
              <button
                className={`feature-explorer__filter-btn ${selectedPhase === null ? "feature-explorer__filter-btn--active" : ""}`}
                onClick={() => setSelectedPhase(null)}
              >
                All
              </button>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <button
                  key={p}
                  className={`feature-explorer__filter-btn ${selectedPhase === p ? "feature-explorer__filter-btn--active" : ""}`}
                  onClick={() => setSelectedPhase(selectedPhase === p ? null : p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature list */}
        <div className="feature-explorer__list">
          {filtered.map((f, i) => (
            <div key={i} className="feature-explorer__item">
              <div className="feature-explorer__item-header">
                <span className="feature-explorer__item-name">{f.name}</span>
                <span className="feature-explorer__item-badge">{f.category}</span>
                <span className="feature-explorer__item-phase">P{f.phase}</span>
              </div>
              <p className="feature-explorer__item-desc">{f.description}</p>
              <code className="feature-explorer__item-source">{f.source}</code>
            </div>
          ))}
        </div>

        <div className="feature-explorer__footer">
          Showing {filtered.length} of {FEATURES.length} features
        </div>
      </div>
    </div>
  );
}
