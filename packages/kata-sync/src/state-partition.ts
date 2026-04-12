import type { GameStateSnapshot } from "@kata-framework/core";
import type { MultiplayerMode, PlayerPosition } from "./types";

export class StatePartition {
  private mode: MultiplayerMode = "shared";
  private playerSnapshots: Map<string, GameStateSnapshot> = new Map();
  private sharedCtx: Record<string, any> = {};
  private playerCtx: Map<string, Record<string, any>> = new Map();
  private syncPoints: Map<string, Set<string>> = new Map(); // syncPointSceneId → arrived players
  private syncPointTargets: Map<string, string> = new Map(); // sceneId → syncPoint target

  setMode(mode: MultiplayerMode): void {
    this.mode = mode;
  }

  getMode(): MultiplayerMode {
    return this.mode;
  }

  registerSyncPoint(sceneId: string, syncPointSceneId: string): void {
    this.syncPointTargets.set(sceneId, syncPointSceneId);
    if (!this.syncPoints.has(syncPointSceneId)) {
      this.syncPoints.set(syncPointSceneId, new Set());
    }
  }

  /** In branching mode, store per-player snapshots */
  setPlayerSnapshot(playerId: string, snapshot: GameStateSnapshot): void {
    this.playerSnapshots.set(playerId, snapshot);
    // Extract player-specific ctx
    this.playerCtx.set(playerId, { ...snapshot.ctx });
  }

  getPlayerSnapshot(playerId: string): GameStateSnapshot | undefined {
    return this.playerSnapshots.get(playerId);
  }

  getPlayerPosition(playerId: string): PlayerPosition {
    const snap = this.playerSnapshots.get(playerId);
    return {
      sceneId: snap?.currentSceneId ?? null,
      actionIndex: snap?.currentActionIndex ?? 0,
    };
  }

  setSharedCtx(ctx: Record<string, any>): void {
    this.sharedCtx = { ...ctx };
  }

  getSharedCtx(): Record<string, any> {
    return { ...this.sharedCtx };
  }

  setPlayerCtx(playerId: string, ctx: Record<string, any>): void {
    this.playerCtx.set(playerId, { ...ctx });
  }

  getPlayerCtx(playerId: string): Record<string, any> {
    return { ...(this.playerCtx.get(playerId) ?? {}) };
  }

  /** Mark a player as arrived at a sync point. Returns true if all expected players arrived. */
  arriveAtSyncPoint(syncPointSceneId: string, playerId: string, totalPlayers: number): boolean {
    const arrived = this.syncPoints.get(syncPointSceneId);
    if (!arrived) return false;

    arrived.add(playerId);
    return arrived.size >= totalPlayers;
  }

  isSyncPointReached(syncPointSceneId: string, totalPlayers: number): boolean {
    const arrived = this.syncPoints.get(syncPointSceneId);
    if (!arrived) return false;
    return arrived.size >= totalPlayers;
  }

  getSyncPointArrivals(syncPointSceneId: string): string[] {
    return [...(this.syncPoints.get(syncPointSceneId) ?? [])];
  }

  clearSyncPoint(syncPointSceneId: string): void {
    this.syncPoints.set(syncPointSceneId, new Set());
  }
}
