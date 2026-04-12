import type { KSONFrame } from "@kata-framework/core";
import type { LogEntry } from "@kata-framework/core/plugins/logger";

interface DebugPanelProps {
  frame: KSONFrame | null;
  logEntries: LogEntry[];
  plugins: string[];
  onClose: () => void;
}

export function DebugPanel({ frame, logEntries, plugins, onClose }: DebugPanelProps) {
  const recentLogs = logEntries.slice(-30).reverse();

  return (
    <div className="debug-panel" role="complementary" aria-label="Debug Panel">
      <div className="debug-panel__header">
        <span className="debug-panel__title">Engine Debug</span>
        <button className="debug-panel__close" onClick={onClose}>X</button>
      </div>
      <div className="debug-panel__body">
        <div className="debug-panel__section">
          <div className="debug-panel__section-title">Current Frame</div>
          <pre className="debug-panel__json">
            {frame ? JSON.stringify({
              scene: frame.meta.id,
              actionType: frame.action.type,
              ...(frame.action.type === "text" ? { speaker: frame.action.speaker } : {}),
            }, null, 2) : "null"}
          </pre>
        </div>

        <div className="debug-panel__section">
          <div className="debug-panel__section-title">Context (ctx)</div>
          <pre className="debug-panel__json">
            {frame ? JSON.stringify(frame.state.ctx, null, 2) : "{}"}
          </pre>
        </div>

        <div className="debug-panel__section">
          <div className="debug-panel__section-title">Plugins ({plugins.length})</div>
          <pre className="debug-panel__json">
            {JSON.stringify(plugins, null, 2)}
          </pre>
        </div>

        <div className="debug-panel__section">
          <div className="debug-panel__section-title">Log ({logEntries.length} entries)</div>
          {recentLogs.map((entry, i) => (
            <div key={i} className="debug-panel__log">
              <span className="debug-panel__log-time">
                {new Date(entry.timestamp).toLocaleTimeString().slice(-8)}
              </span>
              <span className="debug-panel__log-hook">{entry.hook}</span>
              <span>{entry.sceneId || entry.actionType || ""}</span>
            </div>
          ))}
          {recentLogs.length === 0 && (
            <div className="debug-panel__log" style={{ color: "var(--text-dim)" }}>
              No log entries yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
