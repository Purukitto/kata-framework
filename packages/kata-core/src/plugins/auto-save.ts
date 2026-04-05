import type { KSONAction, Choice, GameStateSnapshot } from "../types";
import type { KataPlugin } from "../runtime/plugin";

export type AutoSaveInterval = "scene-change" | "choice" | "every-action" | number;

export interface AutoSaveSlotMeta {
  index: number;
  timestamp: number;
  sceneId: string | null;
}

export interface AutoSaveConfig {
  interval: AutoSaveInterval;
  maxSlots?: number;
  onSave: (snapshot: GameStateSnapshot, slotIndex: number) => void;
}

export interface AutoSavePlugin extends KataPlugin {
  getSlots(): AutoSaveSlotMeta[];
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}

export function autoSavePlugin(config: AutoSaveConfig): AutoSavePlugin {
  const maxSlots = config.maxSlots ?? 3;
  const slots: AutoSaveSlotMeta[] = [];
  let currentSlotIndex = 0;
  let paused = false;
  let engine: { getSnapshot(): GameStateSnapshot } | null = null;
  let timerId: ReturnType<typeof setInterval> | null = null;

  function doSave(): void {
    if (paused || !engine) return;

    const snapshot = engine.getSnapshot();
    const slotIndex = currentSlotIndex % maxSlots;
    const meta: AutoSaveSlotMeta = {
      index: slotIndex,
      timestamp: Date.now(),
      sceneId: snapshot.currentSceneId,
    };

    // Update or add slot metadata
    const existingIdx = slots.findIndex((s) => s.index === slotIndex);
    if (existingIdx >= 0) {
      slots[existingIdx] = meta;
    } else {
      slots.push(meta);
    }

    config.onSave(snapshot, slotIndex);
    currentSlotIndex++;
  }

  function startTimer(): void {
    if (typeof config.interval === "number" && engine) {
      timerId = setInterval(doSave, config.interval);
    }
  }

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  return {
    name: "auto-save",

    init(eng: any): void {
      engine = eng;
      if (typeof config.interval === "number") {
        startTimer();
      }
    },

    beforeSceneChange(_fromId: string | null, _toId: string, _ctx: Record<string, any>): void {
      if (config.interval === "scene-change") {
        doSave();
      }
    },

    onChoice(_choice: Choice, _ctx: Record<string, any>): void {
      if (config.interval === "choice") {
        doSave();
      }
    },

    afterAction(_action: KSONAction, _ctx: Record<string, any>): void {
      if (config.interval === "every-action") {
        doSave();
      }
    },

    getSlots(): AutoSaveSlotMeta[] {
      return [...slots];
    },

    pause(): void {
      paused = true;
      stopTimer();
    },

    resume(): void {
      paused = false;
      if (typeof config.interval === "number") {
        startTimer();
      }
    },

    isPaused(): boolean {
      return paused;
    },
  };
}
