import type { KataPlugin } from "@kata-framework/core";
import type { KSONAction, Choice } from "@kata-framework/core";

export interface ListenerCountConfig {
  /** Base listeners gained per scene visit (default: 50) */
  baseGrowth?: number;
  /** Multiplier when airing risky content (default: 2.0) */
  riskMultiplier?: number;
  /** Listener decay per scene without broadcast (default: 10) */
  idleDecay?: number;
}

export interface ListenerCountPlugin extends KataPlugin {
  getListenerCount(): number;
  getPeakListeners(): number;
  getGrowthHistory(): Array<{ sceneId: string; delta: number; total: number }>;
}

export function listenerCountPlugin(config?: ListenerCountConfig): ListenerCountPlugin {
  const baseGrowth = config?.baseGrowth ?? 50;
  const riskMultiplier = config?.riskMultiplier ?? 2.0;
  const idleDecay = config?.idleDecay ?? 10;

  let engine: any = null;
  let currentListeners = 0;
  let peakListeners = 0;
  const growthHistory: Array<{ sceneId: string; delta: number; total: number }> = [];

  function updatePeak() {
    if (currentListeners > peakListeners) {
      peakListeners = currentListeners;
    }
  }

  function recordGrowth(sceneId: string, delta: number) {
    currentListeners = Math.max(0, currentListeners + delta);
    updatePeak();
    growthHistory.push({ sceneId, delta, total: currentListeners });
  }

  return {
    name: "listener-count",

    init(eng: any) {
      engine = eng;
    },

    beforeSceneChange(_fromId: string | null, toId: string, ctx: Record<string, any>) {
      // Sync with ctx.listeners if it exists (exec blocks may modify it directly)
      if (typeof ctx.listeners === "number") {
        currentListeners = ctx.listeners;
        updatePeak();
      }

      // Scene-based growth: broadcast scenes gain listeners, others decay slightly
      const broadcastScenes = ["first_broadcast", "expose", "caller_maria", "caller_vex", "caller_hale"];
      if (broadcastScenes.includes(toId)) {
        recordGrowth(toId, baseGrowth);
      } else if (toId === "expose") {
        recordGrowth(toId, Math.floor(baseGrowth * riskMultiplier));
      } else {
        // Small idle decay for non-broadcast scenes
        recordGrowth(toId, -idleDecay);
      }
    },

    afterAction(_action: KSONAction, ctx: Record<string, any>) {
      // Keep ctx.listeners in sync with our tracked value
      if (typeof ctx.listeners === "number") {
        currentListeners = ctx.listeners;
        updatePeak();
      }
    },

    getListenerCount() {
      return currentListeners;
    },

    getPeakListeners() {
      return peakListeners;
    },

    getGrowthHistory() {
      return [...growthHistory];
    },
  };
}
