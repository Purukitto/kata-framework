import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";
import type { KataEngine, KSONFrame, GameStateSnapshot } from "@kata-framework/core";
import type { KataSyncTransport } from "./transport";
import type {
  SyncEvent,
  ConnectOptions,
  PlayerInfo,
  ConnectionState,
  ChoicePolicy,
} from "./types";
import { AuthorityTracker } from "./authority";
import { createSyncEvent } from "./sync-event";

export class KataSyncManager extends EventEmitter {
  private engine: KataEngine;
  private transport: KataSyncTransport;
  private seq: number = 0;
  private _playerId: string = "";
  private authorityTracker = new AuthorityTracker();
  private _choicePolicy: ChoicePolicy = { type: "first-writer" };
  private receiveHandler: ((event: SyncEvent) => void) | null = null;
  private engineUpdateHandler: ((frame: KSONFrame) => void) | null = null;
  private engineEndHandler: ((data: any) => void) | null = null;

  constructor(engine: KataEngine, transport: KataSyncTransport) {
    super();
    this.engine = engine;
    this.transport = transport;
  }

  get playerId(): string {
    return this._playerId;
  }

  get isHost(): boolean {
    return this.authorityTracker.isAuthority(this._playerId);
  }

  get connectionState(): ConnectionState {
    return this.transport.state;
  }

  async connect(roomId: string, options?: ConnectOptions): Promise<void> {
    this._playerId = options?.playerId ?? nanoid();
    const role = options?.role ?? "player";

    await this.transport.connect(roomId);

    // Set up receive handler BEFORE broadcasting join so we can receive responses
    this.receiveHandler = (event: SyncEvent) => this.handleReceive(event);
    this.transport.onReceive(this.receiveHandler);

    // Listen for engine events (authority broadcasts them)
    this.engineUpdateHandler = (frame: KSONFrame) => {
      if (this.isHost) {
        this.transport.send(
          createSyncEvent("snapshot", { frame }, this._playerId, this.seq++),
        );
      }
      this.emit("frame", frame);
    };
    this.engine.on("update", this.engineUpdateHandler);

    this.engineEndHandler = (data: any) => {
      if (this.isHost) {
        this.transport.send(
          createSyncEvent("snapshot", { end: true, ...data }, this._playerId, this.seq++),
        );
      }
      this.emit("end", data);
    };
    this.engine.on("end", this.engineEndHandler);

    // Register self
    const joinedAt = Date.now();
    this.authorityTracker.addPlayer({
      id: this._playerId,
      connected: true,
      role,
      joinedAt,
    });

    // Broadcast join event to peers
    this.transport.send(
      createSyncEvent(
        "player-joined",
        { id: this._playerId, connected: true, role, joinedAt } satisfies PlayerInfo,
        this._playerId,
        this.seq++,
      ),
    );
  }

  disconnect(): void {
    if (this.receiveHandler) {
      this.transport.offReceive(this.receiveHandler);
      this.receiveHandler = null;
    }
    if (this.engineUpdateHandler) {
      this.engine.off("update", this.engineUpdateHandler);
      this.engineUpdateHandler = null;
    }
    if (this.engineEndHandler) {
      this.engine.off("end", this.engineEndHandler);
      this.engineEndHandler = null;
    }

    this.transport.send(
      createSyncEvent("player-left", { id: this._playerId }, this._playerId, this.seq++),
    );

    this.transport.disconnect();
  }

  start(sceneId: string): void {
    if (this.isHost) {
      this.engine.start(sceneId);
    } else {
      // Send intent to authority
      this.transport.send(
        createSyncEvent("start", { sceneId }, this._playerId, this.seq++),
      );
    }
  }

  next(): void {
    if (this.isHost) {
      this.engine.next();
    } else {
      this.transport.send(
        createSyncEvent("next", null, this._playerId, this.seq++),
      );
    }
  }

  makeChoice(choiceId: string): void {
    if (this.isHost) {
      this.engine.makeChoice(choiceId);
    } else {
      this.transport.send(
        createSyncEvent("choice", { choiceId }, this._playerId, this.seq++),
      );
    }
  }

  setChoicePolicy(policy: ChoicePolicy): void {
    this._choicePolicy = policy;
  }

  getPlayers(): PlayerInfo[] {
    return this.authorityTracker.getPlayers();
  }

  getSnapshot(): GameStateSnapshot {
    return this.engine.getSnapshot();
  }

  private handleReceive(event: SyncEvent): void {
    switch (event.type) {
      case "player-joined": {
        const info = event.payload as PlayerInfo;
        this.authorityTracker.addPlayer(info);
        this.emit("player-joined", info);

        // If we're authority and a new player joined, send them the roster + game state
        if (this.isHost) {
          const roster = this.authorityTracker.getPlayers();
          let snapshot: GameStateSnapshot | null = null;
          try {
            snapshot = this.engine.getSnapshot();
          } catch {
            // Engine may not have started yet
          }
          this.transport.send(
            createSyncEvent(
              "snapshot-response",
              { snapshot, roster },
              this._playerId,
              this.seq++,
            ),
          );
        }
        break;
      }

      case "player-left": {
        const { id } = event.payload as { id: string };
        const newAuthority = this.authorityTracker.removePlayer(id);
        this.emit("player-left", { id });
        if (newAuthority !== null) {
          this.emit("authority-changed", { newAuthorityId: newAuthority });
        }
        break;
      }

      case "start": {
        // Intent from follower — authority processes it
        if (this.isHost) {
          const { sceneId } = event.payload as { sceneId: string };
          this.engine.start(sceneId);
        }
        break;
      }

      case "next": {
        if (this.isHost) {
          this.engine.next();
        }
        break;
      }

      case "choice": {
        if (this.isHost) {
          const { choiceId } = event.payload as { choiceId: string };
          this.engine.makeChoice(choiceId);
        }
        break;
      }

      case "snapshot": {
        // Frame broadcast from authority — follower applies it
        if (!this.isHost) {
          const payload = event.payload as any;
          if (payload.end) {
            this.emit("end", payload);
          } else if (payload.frame) {
            this.emit("frame", payload.frame);
          }
        }
        break;
      }

      case "snapshot-response": {
        // Roster + state from authority — rebuild tracker
        const { snapshot, roster } = event.payload as {
          snapshot: GameStateSnapshot | null;
          roster?: PlayerInfo[];
        };
        if (roster) {
          this.authorityTracker = new AuthorityTracker();
          for (const player of roster) {
            // Restore original role (authority→player for tracker, it auto-assigns authority)
            this.authorityTracker.addPlayer({
              ...player,
              role: player.role === "authority" ? "player" : player.role,
            });
          }
        }
        if (snapshot) {
          this.engine.loadSnapshot(snapshot);
        }
        break;
      }

      case "authority-changed": {
        this.emit("authority-changed", event.payload);
        break;
      }
    }
  }
}
