import { EventEmitter } from "eventemitter3";
import type { KSONScene } from "@kata-framework/core";
import type { SyncEvent } from "../types";
import { Room } from "./room";

export interface KataServerOptions {
  port: number;
  roomTimeout?: number;
  maxPlayersPerRoom?: number;
}

interface JoinPayload {
  roomId: string;
  playerId: string;
  role?: "player" | "spectator";
  scenes?: KSONScene[];
}

export class KataServer extends EventEmitter {
  private rooms: Map<string, Room> = new Map();
  private server: ReturnType<typeof Bun.serve> | null = null;
  private options: KataServerOptions;

  constructor(options: KataServerOptions) {
    super();
    this.options = options;
  }

  start(): void {
    const self = this;
    this.server = Bun.serve({
      port: this.options.port,
      fetch(req, server) {
        if (server.upgrade(req, { data: {} })) return undefined;
        return new Response("Kata Sync Server", { status: 200 });
      },
      websocket: {
        open(ws) {
          (ws as any)._kataPlayerId = null;
          (ws as any)._kataRoomId = null;
        },
        message(ws, message) {
          const data = typeof message === "string" ? message : new TextDecoder().decode(message);
          let event: SyncEvent;
          try {
            event = JSON.parse(data);
          } catch {
            return;
          }

          const playerId = (ws as any)._kataPlayerId as string | null;
          const roomId = (ws as any)._kataRoomId as string | null;

          // Handle join
          if (event.type === "player-joined" && !playerId) {
            const payload = event.payload as JoinPayload;
            const rid = payload.roomId;
            const pid = payload.playerId;
            const role = payload.role ?? "player";

            (ws as any)._kataPlayerId = pid;
            (ws as any)._kataRoomId = rid;

            let room = self.rooms.get(rid);
            if (!room) {
              room = new Room(rid, payload.scenes);
              self.rooms.set(rid, room);
              self.emit("room-created", rid);
            }

            room.addPlayer(pid, (d: string) => ws.send(d), role);
            self.emit("player-joined", rid, pid);
            return;
          }

          // Handle other intents
          if (playerId && roomId) {
            const room = self.rooms.get(roomId);
            if (room) {
              room.handleIntent(event);
            }
          }
        },
        close(ws) {
          const playerId = (ws as any)._kataPlayerId as string | null;
          const roomId = (ws as any)._kataRoomId as string | null;

          if (playerId && roomId) {
            const room = self.rooms.get(roomId);
            if (room) {
              room.removePlayer(playerId);
              self.emit("player-left", roomId, playerId);

              if (room.isEmpty()) {
                room.scheduleCleanup(self.options.roomTimeout ?? 60000, () => {
                  self.rooms.delete(roomId);
                  self.emit("room-closed", roomId);
                });
              }
            }
          }
        },
      },
    });
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomIds(): string[] {
    return [...this.rooms.keys()];
  }

  get port(): number {
    return (this.server as any)?.port ?? this.options.port;
  }
}

export { Room } from "./room";
