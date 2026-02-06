export interface KSONMeta {
  id: string;
  title?: string;
  layout?: string;
  assets?: Record<string, string>;
}

export type KSONAction =
  | { type: "text"; speaker: string; content: string }
  | { type: "choice"; choices: Choice[] }
  | { type: "visual"; layer: string; src: string; effect?: string }
  | { type: "wait"; duration: number }
  | { type: "exec"; code: string };

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
