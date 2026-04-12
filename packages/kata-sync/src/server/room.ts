import { KataEngine } from "@kata-framework/core";
import type { KSONScene, KSONFrame, GameStateSnapshot } from "@kata-framework/core";
import type { SyncEvent, PlayerInfo, ChoicePolicy } from "../types";
import { createSyncEvent } from "../sync-event";

export interface PlayerConnection {
  info: PlayerInfo;
  send: (data: string) => void;
}

export class Room {
  readonly id: string;
  readonly engine: KataEngine;
  readonly players: Map<string, PlayerConnection> = new Map();
  readonly eventLog: SyncEvent[] = [];
  private seq: number = 0;
  private choicePolicy: ChoicePolicy = { type: "first-writer" };
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(id: string, scenes?: KSONScene[]) {
    this.id = id;
    this.engine = new KataEngine();

    if (scenes) {
      for (const scene of scenes) {
        this.engine.registerScene(scene);
      }
    }

    // Forward engine events to all connected players
    this.engine.on("update", (frame: KSONFrame) => {
      const event = createSyncEvent("snapshot", { frame }, "server", this.seq++);
      this.eventLog.push(event);
      this.broadcast(event);
    });

    this.engine.on("end", (data: any) => {
      const event = createSyncEvent("snapshot", { end: true, ...data }, "server", this.seq++);
      this.eventLog.push(event);
      this.broadcast(event);
    });
  }

  addPlayer(playerId: string, send: (data: string) => void, role: "player" | "spectator" = "player"): void {
    const info: PlayerInfo = {
      id: playerId,
      connected: true,
      role: this.players.size === 0 && role !== "spectator" ? "authority" : role,
      joinedAt: Date.now(),
    };
    this.players.set(playerId, { info, send });

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Notify existing players
    const joinEvent = createSyncEvent("player-joined", info, playerId, this.seq++);
    this.broadcast(joinEvent, playerId);

    // Send current roster + state to new player
    const roster = [...this.players.values()].map((p) => p.info);
    let snapshot: GameStateSnapshot | null = null;
    try {
      snapshot = this.engine.getSnapshot();
    } catch {
      // Engine not started yet
    }
    const responseEvent = createSyncEvent("snapshot-response", { snapshot, roster }, "server", this.seq++);
    send(JSON.stringify(responseEvent));
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const wasAuthority = player.info.role === "authority";
    this.players.delete(playerId);

    // Notify remaining players
    const leftEvent = createSyncEvent("player-left", { id: playerId }, playerId, this.seq++);
    this.broadcast(leftEvent);

    // Authority migration
    if (wasAuthority && this.players.size > 0) {
      const candidates = [...this.players.values()]
        .filter((p) => p.info.role !== "spectator")
        .sort((a, b) => a.info.joinedAt - b.info.joinedAt);

      if (candidates[0]) {
        candidates[0].info.role = "authority";
        const migrateEvent = createSyncEvent(
          "authority-changed",
          { newAuthorityId: candidates[0].info.id },
          "server",
          this.seq++,
        );
        this.broadcast(migrateEvent);
      }
    }

    return wasAuthority;
  }

  handleIntent(event: SyncEvent): void {
    const player = this.players.get(event.playerId);
    if (!player) return;

    // Spectators cannot send intents
    if (player.info.role === "spectator") return;

    switch (event.type) {
      case "start": {
        const { sceneId } = event.payload as { sceneId: string };
        this.engine.start(sceneId);
        break;
      }
      case "next": {
        this.engine.next();
        break;
      }
      case "choice": {
        const { choiceId } = event.payload as { choiceId: string };
        this.engine.makeChoice(choiceId);
        break;
      }
    }
  }

  broadcast(event: SyncEvent, excludePlayerId?: string): void {
    const data = JSON.stringify(event);
    for (const [id, player] of this.players) {
      if (id !== excludePlayerId) {
        player.send(data);
      }
    }
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  scheduleCleanup(timeout: number, onCleanup: () => void): void {
    this.cleanupTimer = setTimeout(() => {
      if (this.isEmpty()) {
        onCleanup();
      }
    }, timeout);
  }

  getSnapshot(): GameStateSnapshot {
    return this.engine.getSnapshot();
  }
}
