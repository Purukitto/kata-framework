import { useState, useEffect, useCallback, useRef } from "react";
import { KataProvider, useKata, useKataEngine } from "@kata-framework/react";
import type { KSONScene, KataEngine } from "@kata-framework/core";
import type { AnalyticsPlugin, AnalyticsReport } from "@kata-framework/core/plugins/analytics";
import type { LogEntry } from "@kata-framework/core/plugins/logger";
import { StudioView } from "./components/StudioView";
import { SignalMeter } from "./components/SignalMeter";
import { AlertLight } from "./components/AlertLight";
import { ContentWarningOverlay } from "./components/ContentWarningOverlay";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { DebugPanel } from "./components/DebugPanel";
import { LocaleSwitcher } from "./components/LocaleSwitcher";
import { ModManager, type ModInfo } from "./components/ModManager";
import { SceneGraphView } from "./components/SceneGraphView";
import { FeatureExplorer } from "./components/FeatureExplorer";

export interface LocaleEntry {
  sceneId: string;
  locale: string;
  overrides: Array<{ index: number; content?: string; speaker?: string }>;
}

interface StudioShellProps {
  engine: KataEngine;
  analyticsPlugin: AnalyticsPlugin;
  logEntries: LogEntry[];
  contentWarningEvents: Array<{ sceneId: string; tags: string[] }>;
  sceneGraph?: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> };
  availableMods?: ModInfo[];
}

function StudioShell({
  engine,
  analyticsPlugin,
  logEntries,
  contentWarningEvents,
  sceneGraph,
  availableMods = [],
}: StudioShellProps) {
  const { frame } = useKata();
  const [showDebug, setShowDebug] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMods, setShowMods] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [currentLocale, setCurrentLocale] = useState("");
  const [mods, setMods] = useState<ModInfo[]>(availableMods);
  const [pendingWarning, setPendingWarning] = useState<{ sceneId: string; tags: string[] } | null>(null);

  // Watch for content warning events
  useEffect(() => {
    const lastEvent = contentWarningEvents[contentWarningEvents.length - 1];
    if (lastEvent && (!pendingWarning || lastEvent.sceneId !== pendingWarning.sceneId)) {
      setPendingWarning(lastEvent);
    }
  }, [contentWarningEvents.length]);

  const handleLocaleSwitch = useCallback((locale: string) => {
    engine.setLocale(locale);
    setCurrentLocale(locale);
  }, [engine]);

  const handleModToggle = useCallback((modId: string, enabled: boolean) => {
    setMods((prev) => prev.map((m) => m.id === modId ? { ...m, enabled } : m));
  }, []);

  const ctx = frame?.state?.ctx ?? {};
  const listeners = typeof ctx.listeners === "number" ? ctx.listeners : 0;
  const suspicion = typeof ctx.suspicion === "number" ? ctx.suspicion : 0;
  const intel = typeof ctx.intel === "number" ? ctx.intel : 0;

  const signalStrength = Math.min(100, Math.round((listeners / 1000) * 100));
  const pluginNames = engine.getPlugins();

  return (
    <div className="studio">
      {/* Header Bar */}
      <header className="studio__header">
        <div className="studio__brand">
          <div className={`studio__signal-dot ${suspicion >= 3 ? "studio__signal-dot--danger" : ""}`} />
          <div>
            <div className="studio__title">Radio Free Signal</div>
            <div className="studio__subtitle">{frame?.meta.title ?? "The Last Broadcast"}</div>
          </div>
        </div>
        <div className="studio__header-stats">
          <LocaleSwitcher currentLocale={currentLocale} onSwitch={handleLocaleSwitch} />
          <SignalMeter value={signalStrength} label="Signal" />
          <div className="studio__stat">
            <span className="studio__stat-value">{listeners}</span>
            <span className="studio__stat-label">Listeners</span>
          </div>
          <div className="studio__stat">
            <span className="studio__stat-value">{intel}</span>
            <span className="studio__stat-label">Intel</span>
          </div>
          <AlertLight level={suspicion} threshold={3} />
        </div>
      </header>

      {/* Main content */}
      <main className="studio__main">
        <div className="studio__content">
          <StudioView />
        </div>

        {/* Side panels */}
        {showAnalytics && (
          <div style={{ position: "fixed", right: showDebug ? 400 : 16, top: 60, width: 320, zIndex: 30 }}>
            <AnalyticsDashboard
              report={analyticsPlugin.getReport()}
              onClose={() => setShowAnalytics(false)}
            />
          </div>
        )}

        {showMods && (
          <div style={{ position: "fixed", left: 16, top: 60, width: 340, zIndex: 30 }}>
            <ModManager
              mods={mods}
              onToggle={handleModToggle}
              onClose={() => setShowMods(false)}
            />
          </div>
        )}

        {showGraph && sceneGraph && (
          <div style={{ position: "fixed", left: 16, bottom: 60, width: 400, maxHeight: "50vh", zIndex: 30 }}>
            <SceneGraphView
              graph={sceneGraph}
              currentSceneId={frame?.meta.id}
              onClose={() => setShowGraph(false)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="studio__footer">
        <div className="studio__footer-left">
          <span>Scene: {frame?.meta.id ?? "—"}</span>
          <span>Plugins: {pluginNames.length}</span>
          {currentLocale && <span>Locale: {currentLocale.toUpperCase()}</span>}
        </div>
        <div className="studio__footer-right">
          <button
            className={`studio__footer-btn ${showFeatures ? "studio__footer-btn--active" : ""}`}
            onClick={() => setShowFeatures(!showFeatures)}
          >
            Features
          </button>
          <button
            className={`studio__footer-btn ${showGraph ? "studio__footer-btn--active" : ""}`}
            onClick={() => setShowGraph(!showGraph)}
          >
            Graph
          </button>
          <button
            className={`studio__footer-btn ${showMods ? "studio__footer-btn--active" : ""}`}
            onClick={() => setShowMods(!showMods)}
          >
            Mods
          </button>
          <button
            className={`studio__footer-btn ${showAnalytics ? "studio__footer-btn--active" : ""}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            Analytics
          </button>
          <button
            className={`studio__footer-btn ${showDebug ? "studio__footer-btn--active" : ""}`}
            onClick={() => setShowDebug(!showDebug)}
          >
            Debug
          </button>
        </div>
      </footer>

      {/* Debug panel (slides in from right) */}
      {showDebug && (
        <DebugPanel
          frame={frame}
          logEntries={logEntries}
          plugins={pluginNames}
          onClose={() => setShowDebug(false)}
        />
      )}

      {/* Feature Explorer overlay */}
      {showFeatures && (
        <FeatureExplorer onClose={() => setShowFeatures(false)} />
      )}

      {/* Content Warning overlay */}
      {pendingWarning && (
        <ContentWarningOverlay
          sceneId={pendingWarning.sceneId}
          tags={pendingWarning.tags}
          onContinue={() => setPendingWarning(null)}
          onBack={() => {
            setPendingWarning(null);
            engine.back();
          }}
        />
      )}
    </div>
  );
}

interface AppProps {
  scenes: KSONScene[];
  locales?: LocaleEntry[];
}

export function App({ scenes, locales = [] }: AppProps) {
  return (
    <KataProvider initialScenes={scenes}>
      <AppInner scenes={scenes} locales={locales} />
    </KataProvider>
  );
}

function AppInner({ scenes, locales }: { scenes: KSONScene[]; locales: LocaleEntry[] }) {
  const engine = useKataEngine();
  const registeredRef = useRef(false);

  // Register locale overrides with the engine (once)
  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;
    for (const entry of locales) {
      engine.registerLocale(entry.sceneId, entry.locale, entry.overrides);
    }
  }, [engine, locales]);

  const stubAnalytics = {
    getReport: () => ({
      sceneVisits: {},
      choiceSelections: {},
      averageActionsPerScene: {},
      dropOffPoints: [],
      sessionDuration: 0,
    }),
  } as any;

  const stubMods: ModInfo[] = [
    {
      id: "alternate-caller",
      name: "Alternate Caller: Ray",
      description: "Adds Ray, a rogue engineer who can boost your signal.",
      version: "1.0.0",
      enabled: false,
    },
  ];

  return (
    <StudioShell
      engine={engine}
      analyticsPlugin={stubAnalytics}
      logEntries={[]}
      contentWarningEvents={[]}
      availableMods={stubMods}
    />
  );
}
