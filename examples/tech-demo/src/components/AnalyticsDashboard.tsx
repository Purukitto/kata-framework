import type { AnalyticsReport } from "@kata-framework/core/plugins/analytics";

interface AnalyticsDashboardProps {
  report: AnalyticsReport;
  onClose: () => void;
}

export function AnalyticsDashboard({ report, onClose }: AnalyticsDashboardProps) {
  return (
    <div className="analytics" role="complementary" aria-label="Analytics Dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className="analytics__title">Broadcast Analytics</h3>
        <button className="toolbar-btn" onClick={onClose} style={{ fontSize: "0.7rem" }}>Close</button>
      </div>

      <div className="analytics__section">
        <div className="analytics__section-title">Scene Visits</div>
        {Object.entries(report.sceneVisits).map(([scene, count]) => (
          <div key={scene} className="analytics__row">
            <span className="analytics__row-label">{scene}</span>
            <span className="analytics__row-value">{count}</span>
          </div>
        ))}
        {Object.keys(report.sceneVisits).length === 0 && (
          <div className="analytics__row">
            <span className="analytics__row-label" style={{ color: "var(--text-dim)" }}>No data yet</span>
          </div>
        )}
      </div>

      <div className="analytics__section">
        <div className="analytics__section-title">Choice Selections</div>
        {Object.entries(report.choiceSelections).map(([choice, count]) => (
          <div key={choice} className="analytics__row">
            <span className="analytics__row-label">{choice}</span>
            <span className="analytics__row-value">{count}</span>
          </div>
        ))}
      </div>

      {report.dropOffPoints.length > 0 && (
        <div className="analytics__section">
          <div className="analytics__section-title">Drop-off Points</div>
          {report.dropOffPoints.map((scene) => (
            <div key={scene} className="analytics__row">
              <span className="analytics__row-label">{scene}</span>
              <span className="analytics__row-value" style={{ color: "var(--accent)" }}>Exit</span>
            </div>
          ))}
        </div>
      )}

      <div className="analytics__section">
        <div className="analytics__section-title">Session</div>
        <div className="analytics__row">
          <span className="analytics__row-label">Duration</span>
          <span className="analytics__row-value">{Math.round(report.sessionDuration / 1000)}s</span>
        </div>
      </div>
    </div>
  );
}
