export interface KSONMeta {
  id: string;
  title?: string;
  layout?: string;
  assets?: Record<string, string>;
}

export type AudioCommand =
  | { action: "play"; id: string; loop?: boolean }
  | { action: "stop"; id: string }
  | { action: "setVolume"; id: string; volume: number }
  | { action: "fade"; id: string; toVolume: number; durationMs: number };

export type KSONAction =
  | { type: "text"; speaker: string; content: string }
  | { type: "choice"; choices: Choice[] }
  | { type: "visual"; layer: string; src: string; effect?: string }
  | { type: "wait"; duration: number }
  | { type: "exec"; code: string }
  | { type: "condition"; condition: string; then: KSONAction[] }
  | { type: "audio"; command: AudioCommand };

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

export interface KSONFrame {
  meta: KSONMeta;
  action: KSONAction;
  state: Record<string, any>;
}

export interface GameStateSnapshot {
  schemaVersion: number;
  ctx: Record<string, any>;
  currentSceneId: string | null;
  currentActionIndex: number;
  history: string[];
  expandedActions?: KSONAction[];
}
