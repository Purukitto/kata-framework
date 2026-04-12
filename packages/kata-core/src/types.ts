export interface MultiplayerMeta {
  mode?: "shared" | "branching";
  choicePolicy?: string;
  syncPoint?: string;
}

export interface KSONMeta {
  id: string;
  title?: string;
  layout?: string;
  assets?: Record<string, string>;
  multiplayer?: MultiplayerMeta;
}

export type AudioCommand =
  | { action: "play"; id: string; channel?: string; src?: string; loop?: boolean }
  | { action: "stop"; id: string; channel?: string }
  | { action: "pause"; id: string; channel?: string }
  | { action: "volume"; channel: string; value: number }
  | { action: "setVolume"; id: string; channel?: string; volume: number }
  | { action: "fade"; id: string; toVolume: number; durationMs: number };

export type KSONAction =
  | { type: "text"; speaker: string; content: string }
  | { type: "choice"; choices: Choice[] }
  | { type: "visual"; layer: string; src: string; effect?: string }
  | { type: "wait"; duration: number }
  | { type: "exec"; code: string }
  | {
      type: "condition";
      condition: string;
      then: KSONAction[];
      elseIf?: Array<{ condition: string; then: KSONAction[] }>;
      else?: KSONAction[];
    }
  | { type: "audio"; command: AudioCommand }
  | {
      type: "tween";
      target: string;
      property: string;
      from?: number;
      to: number;
      duration: number;
      easing?: string;
    }
  | {
      type: "tween-group";
      mode: "parallel" | "sequence";
      tweens: Array<{
        target: string;
        property: string;
        from?: number;
        to: number;
        duration: number;
        easing?: string;
      }>;
    };

export interface Choice {
  id: string;
  label: string;
  target?: string;
  action?: string;
  condition?: string;
}

export interface KSONScene {
  meta: KSONMeta;
  script: string;
  actions: KSONAction[];
}

export interface A11yHints {
  role?: string;
  liveRegion?: "assertive" | "polite" | "off";
  label?: string;
  description?: string;
  keyHints?: Array<{ choiceId: string; hint: string }>;
  reducedMotion?: boolean;
}

export interface KSONFrame {
  meta: KSONMeta;
  action: KSONAction;
  state: Record<string, any>;
  a11y?: A11yHints;
}

export interface Diagnostic {
  level: "error" | "warning" | "info";
  message: string;
  sceneId?: string;
  line?: number;
  actionIndex?: number;
}

export interface LocaleOverride {
  index: number;
  speaker?: string;
  content?: string;
}

export interface LocaleData {
  locale: string;
  overrides: LocaleOverride[];
}

export interface KataEngineOptions {
  historyDepth?: number;
  locale?: string;
  localeFallback?: string;
  onMissingScene?: "throw" | "error-event" | "fallback";
  fallbackSceneId?: string;
  evalTimeout?: number;
}

export interface UndoEntry {
  ctx: Record<string, any>;
  currentSceneId: string | null;
  currentActionIndex: number;
  history: string[];
  expandedActions?: KSONAction[];
}

export interface GameStateSnapshot {
  schemaVersion: number;
  ctx: Record<string, any>;
  currentSceneId: string | null;
  currentActionIndex: number;
  history: string[];
  expandedActions?: KSONAction[];
  undoStack?: UndoEntry[];
  locale?: string;
  localeFallback?: string;
}
