import type { KSONScene } from "@kata-framework/core";

// --- Sync Protocol ---

export type SyncEventType =
  | "start"
  | "next"
  | "choice"
  | "set-context"
  | "snapshot"
  | "player-joined"
  | "player-left"
  | "authority-changed"
  | "sync-point-reached"
  | "snapshot-request"
  | "snapshot-response";

export interface SyncEvent {
  type: SyncEventType;
  payload: unknown;
  playerId: string;
  seq: number;
  timestamp: number;
}

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface ConnectOptions {
  playerId?: string;
  role?: "player" | "spectator";
  scenes?: KSONScene[];
}

// --- Players ---

export interface PlayerInfo {
  id: string;
  connected: boolean;
  role: "authority" | "player" | "spectator";
  joinedAt: number;
}

// --- Choice Policies ---

export type ChoicePolicy =
  | { type: "first-writer" }
  | { type: "designated"; playerId: string }
  | {
      type: "vote";
      timeout: number;
      resolver: (votes: Map<string, string>) => string;
    };

// --- State Partitioning ---

export type MultiplayerMode = "shared" | "branching";

export interface MultiplayerMeta {
  mode?: MultiplayerMode;
  choicePolicy?: "first-writer" | "designated" | "per-player" | "vote";
  syncPoint?: string;
}

export interface PlayerPosition {
  sceneId: string | null;
  actionIndex: number;
}
