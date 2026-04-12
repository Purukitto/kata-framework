import type { KataSyncTransport } from "../transport";
import type { SyncEvent, ConnectionState } from "../types";
import { createSyncEvent } from "../sync-event";

export interface WebSocketTransportOptions {
  playerId: string;
  role?: "player" | "spectator";
  scenes?: any[];
}

export class WebSocketTransport implements KataSyncTransport {
  private url: string;
  private _state: ConnectionState = "disconnected";
  private ws: WebSocket | null = null;
  private receiveHandlers: Set<(event: SyncEvent) => void> = new Set();
  private connectionHandlers: Set<(state: ConnectionState) => void> = new Set();
  private options: WebSocketTransportOptions;

  constructor(url: string, options: WebSocketTransportOptions) {
    this.url = url;
    this.options = options;
  }

  get state(): ConnectionState {
    return this._state;
  }

  connect(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._state = "connecting";
      for (const handler of this.connectionHandlers) handler("connecting");

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this._state = "connected";
        for (const handler of this.connectionHandlers) handler("connected");

        // Send join event
        const joinEvent = createSyncEvent(
          "player-joined",
          {
            roomId,
            playerId: this.options.playerId,
            role: this.options.role ?? "player",
            scenes: this.options.scenes,
          },
          this.options.playerId,
          0,
        );
        this.ws!.send(JSON.stringify(joinEvent));
        resolve();
      };

      this.ws.onmessage = (event) => {
        let syncEvent: SyncEvent;
        try {
          syncEvent = JSON.parse(event.data as string);
        } catch {
          return;
        }
        for (const handler of this.receiveHandlers) {
          handler(syncEvent);
        }
      };

      this.ws.onclose = () => {
        this._state = "disconnected";
        for (const handler of this.connectionHandlers) handler("disconnected");
      };

      this.ws.onerror = () => {
        if (this._state === "connecting") {
          reject(new Error("WebSocket connection failed"));
        }
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._state = "disconnected";
    for (const handler of this.connectionHandlers) handler("disconnected");
  }

  send(event: SyncEvent): void {
    if (this.ws && this._state === "connected") {
      this.ws.send(JSON.stringify(event));
    }
  }

  onReceive(handler: (event: SyncEvent) => void): void {
    this.receiveHandlers.add(handler);
  }

  offReceive(handler: (event: SyncEvent) => void): void {
    this.receiveHandlers.delete(handler);
  }

  onConnectionChange(handler: (state: ConnectionState) => void): void {
    this.connectionHandlers.add(handler);
  }
}
