import type { KataEngine, KataPlugin, KSONFrame } from "@kata-framework/core";
import type {
  DevtoolsPlugin,
  DevtoolsOptions,
  TimelineEntry,
  InspectorState,
  ProfilerReport,
  PluginHookTiming,
  LatencyStats,
  EventLogEntry,
  HookName,
} from "./types";

const HOOKS: HookName[] = [
  "beforeAction",
  "afterAction",
  "onChoice",
  "beforeSceneChange",
  "onEnd",
];

const WRAPPED = Symbol.for("kata.devtools.wrapped");

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function isProduction(): boolean {
  try {
    return typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  } catch {
    return false;
  }
}

function safeClone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function noopDevtoolsPlugin(): DevtoolsPlugin {
  const empty: ProfilerReport = {
    hooks: [],
    slowestPlugin: null,
    frameLatency: { count: 0, avgMs: 0, minMs: 0, maxMs: 0 },
  };
  return {
    name: "devtools",
    enabled: false,
    getInspectorState: () => ({
      currentSceneId: null,
      currentActionIndex: 0,
      currentFrame: null,
      ctx: {},
      pluginNames: [],
      frameCount: 0,
    }),
    getTimeline: () => [],
    getTimelineEntry: () => undefined,
    getProfilerReport: () => empty,
    getEventLog: () => [],
    subscribe: () => () => {},
    evalExpression: () => ({ ok: false, error: "devtools disabled" }),
    reset: () => {},
  };
}

export function devtoolsPlugin(options: DevtoolsOptions = {}): DevtoolsPlugin {
  const enabled = options.enabled ?? !isProduction();
  if (!enabled) return noopDevtoolsPlugin();

  const maxTimelineEntries = options.maxTimelineEntries ?? 500;

  const timeline: TimelineEntry[] = [];
  const eventLog: EventLogEntry[] = [];
  const listeners = new Set<() => void>();

  // Profiler state
  const hookTimings = new Map<string, { count: number; total: number; max: number }>();
  const latency: number[] = [];
  let pendingCallStart: number | null = null;

  let engineRef: KataEngine | null = null;
  let detached = false;
  let frameCounter = 0;

  function notify() {
    for (const fn of listeners) fn();
  }

  function recordHook(pluginName: string, hook: HookName, ms: number) {
    const key = `${pluginName}::${hook}`;
    const entry = hookTimings.get(key) ?? { count: 0, total: 0, max: 0 };
    entry.count++;
    entry.total += ms;
    if (ms > entry.max) entry.max = ms;
    hookTimings.set(key, entry);
  }

  function recordLatency(ms: number) {
    latency.push(ms);
    if (latency.length > 1000) latency.shift();
  }

  function wrapPlugin(plugin: KataPlugin) {
    if (plugin === self) return;
    const tagged = plugin as KataPlugin & { [WRAPPED]?: boolean };
    if (tagged[WRAPPED]) return;
    tagged[WRAPPED] = true;

    for (const hook of HOOKS) {
      const orig = plugin[hook] as ((...args: any[]) => any) | undefined;
      if (typeof orig !== "function") continue;
      (plugin as any)[hook] = function (...args: any[]) {
        if (detached) return orig.apply(plugin, args);
        const t0 = now();
        try {
          return orig.apply(plugin, args);
        } finally {
          recordHook(plugin.name, hook, now() - t0);
        }
      };
    }
  }

  function wrapEngineCall<K extends "start" | "next" | "makeChoice" | "back">(
    engine: KataEngine,
    method: K
  ) {
    const orig = engine[method].bind(engine) as (...args: any[]) => void;
    (engine as any)[method] = function (...args: any[]) {
      if (detached) return orig(...args);
      pendingCallStart = now();
      try {
        return orig(...args);
      } finally {
        if (pendingCallStart !== null) {
          recordLatency(now() - pendingCallStart);
          pendingCallStart = null;
        }
      }
    };
  }

  const self: DevtoolsPlugin = {
    name: "devtools",
    enabled: true,

    init(engine: KataEngine) {
      engineRef = engine;

      // Wrap any plugins already registered before devtools.
      const pm = (engine as any).pluginManager;
      if (pm && Array.isArray(pm.plugins)) {
        for (const p of pm.plugins as KataPlugin[]) wrapPlugin(p);
      }

      // Intercept future plugin registrations.
      const origUse = engine.use.bind(engine);
      (engine as any).use = function (plugin: KataPlugin) {
        const result = origUse(plugin);
        wrapPlugin(plugin);
        return result;
      };

      wrapEngineCall(engine, "start");
      wrapEngineCall(engine, "next");
      wrapEngineCall(engine, "makeChoice");
      wrapEngineCall(engine, "back");

      // Detach automatically when removed via engine.removePlugin("devtools")
      const origRemove = engine.removePlugin.bind(engine);
      (engine as any).removePlugin = function (name: string) {
        const result = origRemove(name);
        if (name === "devtools") detached = true;
        return result;
      };

      engine.on("update", (frame: KSONFrame) => {
        if (detached) return;
        const entry: TimelineEntry = {
          index: frameCounter++,
          timestamp: now(),
          sceneId: frame.state.currentSceneId ?? "",
          actionIndex: frame.state.currentActionIndex,
          actionType: frame.action.type,
          frame,
          ctxSnapshot: safeClone(frame.state.ctx),
        };
        timeline.push(entry);
        if (timeline.length > maxTimelineEntries) timeline.shift();
        eventLog.push({
          type: "update",
          timestamp: entry.timestamp,
          sceneId: entry.sceneId,
          actionIndex: entry.actionIndex,
        });
        notify();
      });

      engine.on("end", (payload: { sceneId: string }) => {
        if (detached) return;
        eventLog.push({ type: "end", timestamp: now(), sceneId: payload.sceneId });
        notify();
      });

      engine.on("audio", (command: any) => {
        if (detached) return;
        eventLog.push({ type: "audio", timestamp: now(), command });
      });

      engine.on("error", (error: any) => {
        if (detached) return;
        eventLog.push({ type: "error", timestamp: now(), error });
      });
    },

    getInspectorState(): InspectorState {
      const last = timeline[timeline.length - 1] ?? null;
      const pluginNames = engineRef?.getPlugins() ?? [];
      return {
        currentSceneId: last?.sceneId ?? null,
        currentActionIndex: last?.actionIndex ?? 0,
        currentFrame: last?.frame ?? null,
        ctx: last ? last.ctxSnapshot : {},
        pluginNames,
        frameCount: timeline.length,
      };
    },

    getTimeline(): TimelineEntry[] {
      return timeline.slice();
    },

    getTimelineEntry(index: number): TimelineEntry | undefined {
      return timeline.find((e) => e.index === index);
    },

    getEventLog(): EventLogEntry[] {
      return eventLog.slice();
    },

    getProfilerReport(): ProfilerReport {
      const hooks: PluginHookTiming[] = [];
      const totalsByPlugin = new Map<string, number>();

      for (const [key, value] of hookTimings) {
        const [pluginName, hook] = key.split("::") as [string, HookName];
        hooks.push({
          pluginName,
          hook,
          callCount: value.count,
          totalMs: value.total,
          avgMs: value.count > 0 ? value.total / value.count : 0,
          maxMs: value.max,
        });
        totalsByPlugin.set(pluginName, (totalsByPlugin.get(pluginName) ?? 0) + value.total);
      }

      let slowestPlugin: string | null = null;
      let slowestTotal = -Infinity;
      for (const [name, total] of totalsByPlugin) {
        if (total > slowestTotal) {
          slowestTotal = total;
          slowestPlugin = name;
        }
      }

      const frameLatency: LatencyStats = computeLatencyStats(latency);

      return { hooks, slowestPlugin, frameLatency };
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    evalExpression(expression: string) {
      if (!engineRef) return { ok: false, error: "devtools not attached" };
      const last = timeline[timeline.length - 1];
      const ctx = last ? last.ctxSnapshot : {};
      try {
        const fn = new Function("ctx", `with (ctx) { return (${expression}); }`);
        return { ok: true, value: fn(ctx) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    reset() {
      timeline.length = 0;
      eventLog.length = 0;
      latency.length = 0;
      hookTimings.clear();
      frameCounter = 0;
      notify();
    },
  };

  return self;
}

function computeLatencyStats(samples: number[]): LatencyStats {
  if (samples.length === 0) return { count: 0, avgMs: 0, minMs: 0, maxMs: 0 };
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    total += s;
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return {
    count: samples.length,
    avgMs: total / samples.length,
    minMs: min,
    maxMs: max,
  };
}
