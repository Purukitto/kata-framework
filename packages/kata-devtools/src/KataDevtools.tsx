import React, { useEffect, useState, useSyncExternalStore } from "react";
import type { DevtoolsPlugin } from "./types";

export interface KataDevtoolsProps {
  plugin: DevtoolsPlugin;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  defaultOpen?: boolean;
}

type Tab = "inspector" | "timeline" | "profiler" | "console" | "events";

const TABS: Tab[] = ["inspector", "timeline", "profiler", "console", "events"];

export function KataDevtools({ plugin, position = "bottom-right", defaultOpen = false }: KataDevtoolsProps) {
  const subscribe = (cb: () => void) => plugin.subscribe(cb);
  const getSnapshot = () => plugin.getInspectorState().frameCount;
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>("inspector");

  if (!plugin.enabled) return null;

  const positionStyle = positionStyles[position];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          ...positionStyle,
          zIndex: 999999,
          background: "#1e1e2e",
          color: "#cdd6f4",
          border: "1px solid #45475a",
          borderRadius: 6,
          padding: "6px 10px",
          font: "12px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
          cursor: "pointer",
        }}
        aria-label="Open Kata devtools"
      >
        Kata devtools
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Kata devtools panel"
      style={{
        position: "fixed",
        ...positionStyle,
        zIndex: 999999,
        width: 420,
        maxHeight: "60vh",
        background: "#1e1e2e",
        color: "#cdd6f4",
        border: "1px solid #45475a",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        font: "12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid #45475a",
          background: "#181825",
        }}
      >
        <strong style={{ color: "#a6e3a1" }}>Kata devtools</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close devtools"
          style={{
            background: "transparent",
            color: "#cdd6f4",
            border: "none",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          ×
        </button>
      </header>

      <nav style={{ display: "flex", borderBottom: "1px solid #45475a" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "6px 4px",
              background: tab === t ? "#313244" : "transparent",
              color: tab === t ? "#f5c2e7" : "#cdd6f4",
              border: "none",
              borderRight: "1px solid #45475a",
              cursor: "pointer",
              font: "inherit",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      <div style={{ padding: 12, overflow: "auto", flex: 1 }}>
        {tab === "inspector" && <InspectorPanel plugin={plugin} />}
        {tab === "timeline" && <TimelinePanel plugin={plugin} />}
        {tab === "profiler" && <ProfilerPanel plugin={plugin} />}
        {tab === "console" && <ConsolePanel plugin={plugin} />}
        {tab === "events" && <EventsPanel plugin={plugin} />}
      </div>
    </div>
  );
}

const positionStyles: Record<NonNullable<KataDevtoolsProps["position"]>, React.CSSProperties> = {
  "bottom-right": { right: 16, bottom: 16 },
  "bottom-left": { left: 16, bottom: 16 },
  "top-right": { right: 16, top: 16 },
  "top-left": { left: 16, top: 16 },
};

function InspectorPanel({ plugin }: { plugin: DevtoolsPlugin }) {
  const state = plugin.getInspectorState();
  return (
    <div>
      <Row label="Scene">{state.currentSceneId ?? "—"}</Row>
      <Row label="Action">{state.currentActionIndex}</Row>
      <Row label="Frames">{state.frameCount}</Row>
      <Row label="Plugins">{state.pluginNames.join(", ") || "—"}</Row>
      <details open style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", color: "#89b4fa" }}>ctx</summary>
        <pre style={preStyle}>{JSON.stringify(state.ctx, null, 2)}</pre>
      </details>
    </div>
  );
}

function TimelinePanel({ plugin }: { plugin: DevtoolsPlugin }) {
  const entries = plugin.getTimeline();
  const [selected, setSelected] = useState<number | null>(null);
  const detail = selected !== null ? plugin.getTimelineEntry(selected) : null;
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {entries.map((e) => (
          <li key={e.index}>
            <button
              type="button"
              onClick={() => setSelected(e.index)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: selected === e.index ? "#313244" : "transparent",
                color: "#cdd6f4",
                border: "none",
                padding: "3px 6px",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              #{e.index} [{e.actionType}] {e.sceneId}:{e.actionIndex}
            </button>
          </li>
        ))}
      </ul>
      {detail && (
        <details open style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "#89b4fa" }}>Frame #{detail.index}</summary>
          <pre style={preStyle}>{JSON.stringify(detail.frame, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

function ProfilerPanel({ plugin }: { plugin: DevtoolsPlugin }) {
  const report = plugin.getProfilerReport();
  return (
    <div>
      <Row label="Slowest plugin">{report.slowestPlugin ?? "—"}</Row>
      <Row label="Frame avg ms">{report.frameLatency.avgMs.toFixed(2)}</Row>
      <Row label="Frame max ms">{report.frameLatency.maxMs.toFixed(2)}</Row>
      <Row label="Frame min ms">{report.frameLatency.minMs.toFixed(2)}</Row>
      <Row label="Frame count">{report.frameLatency.count}</Row>
      <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "#a6adc8" }}>
            <th style={thStyle}>Plugin</th>
            <th style={thStyle}>Hook</th>
            <th style={thStyle}>n</th>
            <th style={thStyle}>avg</th>
            <th style={thStyle}>max</th>
          </tr>
        </thead>
        <tbody>
          {report.hooks.map((h, i) => (
            <tr key={i}>
              <td style={tdStyle}>{h.pluginName}</td>
              <td style={tdStyle}>{h.hook}</td>
              <td style={tdStyle}>{h.callCount}</td>
              <td style={tdStyle}>{h.avgMs.toFixed(2)}</td>
              <td style={tdStyle}>{h.maxMs.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsolePanel({ plugin }: { plugin: DevtoolsPlugin }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("");
  return (
    <div>
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="ctx expression…"
        style={{
          width: "100%",
          padding: "4px 6px",
          background: "#181825",
          color: "#cdd6f4",
          border: "1px solid #45475a",
          borderRadius: 4,
          font: "inherit",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const r = plugin.evalExpression(expr);
            setResult(r.ok ? JSON.stringify(r.value, null, 2) : `Error: ${r.error}`);
          }
        }}
      />
      <pre style={preStyle}>{result}</pre>
    </div>
  );
}

function EventsPanel({ plugin }: { plugin: DevtoolsPlugin }) {
  const events = plugin.getEventLog();
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ padding: "2px 0", color: colorForEvent(e.type) }}>
          [{e.type}] {summarizeEvent(e)}
        </li>
      ))}
    </ul>
  );
}

function summarizeEvent(e: ReturnType<DevtoolsPlugin["getEventLog"]>[number]): string {
  switch (e.type) {
    case "update":
      return `${e.sceneId}:${e.actionIndex}`;
    case "end":
      return e.sceneId;
    case "audio":
      return JSON.stringify(e.command);
    case "error":
      return typeof e.error === "object" ? JSON.stringify(e.error) : String(e.error);
  }
}

function colorForEvent(type: string): string {
  switch (type) {
    case "update":
      return "#cdd6f4";
    case "end":
      return "#a6e3a1";
    case "audio":
      return "#89b4fa";
    case "error":
      return "#f38ba8";
    default:
      return "#cdd6f4";
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "2px 0" }}>
      <span style={{ color: "#a6adc8", minWidth: 110 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  padding: 8,
  background: "#11111b",
  border: "1px solid #45475a",
  borderRadius: 4,
  maxHeight: 200,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  font: "11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "2px 4px",
  borderBottom: "1px solid #45475a",
  fontWeight: "normal",
};

const tdStyle: React.CSSProperties = {
  padding: "2px 4px",
  borderBottom: "1px solid #313244",
};
