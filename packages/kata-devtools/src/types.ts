import type { KSONFrame, KSONAction } from "@kata-framework/core";
import type { KataPlugin } from "@kata-framework/core";

export type HookName =
  | "beforeAction"
  | "afterAction"
  | "onChoice"
  | "beforeSceneChange"
  | "onEnd";

export interface TimelineEntry {
  index: number;
  timestamp: number;
  sceneId: string;
  actionIndex: number;
  actionType: KSONAction["type"];
  frame: KSONFrame;
  ctxSnapshot: Record<string, any>;
}

export interface InspectorState {
  currentSceneId: string | null;
  currentActionIndex: number;
  currentFrame: KSONFrame | null;
  ctx: Record<string, any>;
  pluginNames: string[];
  frameCount: number;
}

export interface PluginHookTiming {
  pluginName: string;
  hook: HookName;
  callCount: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
}

export interface LatencyStats {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export interface ProfilerReport {
  hooks: PluginHookTiming[];
  slowestPlugin: string | null;
  frameLatency: LatencyStats;
}

export type EventLogEntry =
  | { type: "update"; timestamp: number; sceneId: string; actionIndex: number }
  | { type: "end"; timestamp: number; sceneId: string }
  | { type: "audio"; timestamp: number; command: any }
  | { type: "error"; timestamp: number; error: any };

export interface DevtoolsOptions {
  /**
   * Force enable/disable. Defaults to enabled unless `process.env.NODE_ENV === "production"`.
   */
  enabled?: boolean;
  /**
   * Maximum timeline entries kept in memory. Older entries are dropped (FIFO).
   */
  maxTimelineEntries?: number;
}

export interface DevtoolsPlugin extends KataPlugin {
  /** True when devtools is actively recording. False in production unless forced on. */
  readonly enabled: boolean;
  getInspectorState(): InspectorState;
  getTimeline(): TimelineEntry[];
  getTimelineEntry(index: number): TimelineEntry | undefined;
  getProfilerReport(): ProfilerReport;
  getEventLog(): EventLogEntry[];
  /** Subscribe to devtools state changes. Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Evaluate a JavaScript expression against the current ctx (read-only). */
  evalExpression(expression: string): { ok: true; value: any } | { ok: false; error: string };
  reset(): void;
}
