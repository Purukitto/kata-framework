import type { KSONAction, Choice } from "../types";
import type { KataPlugin } from "../runtime/plugin";

export interface LogEntry {
  timestamp: number;
  hook: "beforeAction" | "afterAction" | "onChoice" | "beforeSceneChange" | "onEnd";
  sceneId: string | null;
  actionIndex?: number;
  actionType?: string;
  data?: Record<string, any>;
}

export type LogLevel = "quiet" | "normal" | "verbose";

export interface LoggerConfig {
  level?: LogLevel;
  output?: (entry: LogEntry) => void;
}

export interface LoggerPlugin extends KataPlugin {
  getEntries(): LogEntry[];
  clear(): void;
  setLevel(level: LogLevel): void;
}

export function loggerPlugin(config?: LoggerConfig): LoggerPlugin {
  let level: LogLevel = config?.level ?? "normal";
  const outputSink = config?.output ?? (() => {});
  const entries: LogEntry[] = [];

  function shouldLog(hook: LogEntry["hook"]): boolean {
    if (level === "quiet") return false;
    if (level === "normal") {
      return hook === "beforeSceneChange" || hook === "onChoice" || hook === "onEnd";
    }
    // verbose
    return true;
  }

  function log(entry: LogEntry): void {
    entries.push(entry);
    if (shouldLog(entry.hook)) {
      outputSink(entry);
    }
  }

  return {
    name: "logger",

    beforeAction(action: KSONAction, ctx: Record<string, any>): KSONAction {
      log({
        timestamp: Date.now(),
        hook: "beforeAction",
        sceneId: null,
        actionType: action.type,
        data: { speaker: (action as any).speaker },
      });
      return action;
    },

    afterAction(action: KSONAction, ctx: Record<string, any>): void {
      log({
        timestamp: Date.now(),
        hook: "afterAction",
        sceneId: null,
        actionType: action.type,
      });
    },

    onChoice(choice: Choice, ctx: Record<string, any>): void {
      log({
        timestamp: Date.now(),
        hook: "onChoice",
        sceneId: null,
        data: { choiceId: choice.id, label: choice.label },
      });
    },

    beforeSceneChange(fromId: string | null, toId: string, ctx: Record<string, any>): void {
      log({
        timestamp: Date.now(),
        hook: "beforeSceneChange",
        sceneId: toId,
        data: { fromId, toId },
      });
    },

    onEnd(sceneId: string): void {
      log({
        timestamp: Date.now(),
        hook: "onEnd",
        sceneId,
      });
    },

    getEntries(): LogEntry[] {
      return [...entries];
    },

    clear(): void {
      entries.length = 0;
    },

    setLevel(newLevel: LogLevel): void {
      level = newLevel;
    },
  };
}
