import type { KataSyncTransport } from "../transport";
import type { SyncEvent, ConnectionState } from "../types";

export class BroadcastChannelTransport implements KataSyncTransport {
  private _state: ConnectionState = "disconnected";
  private channel: BroadcastChannel | null = null;
  private receiveHandlers: Set<(event: SyncEvent) => void> = new Set();
  private connectionHandlers: Set<(state: ConnectionState) => void> = new Set();
  private boundListener: ((event: MessageEvent) => void) | null = null;

  get state(): ConnectionState {
    return this._state;
  }

  async connect(roomId: string): Promise<void> {
    this.channel = new BroadcastChannel(`kata-sync:${roomId}`);

    this.boundListener = (event: MessageEvent) => {
      const syncEvent = event.data as SyncEvent;
      for (const handler of this.receiveHandlers) {
        handler(syncEvent);
      }
    };
    this.channel.addEventListener("message", this.boundListener as any);

    this._state = "connected";
    for (const handler of this.connectionHandlers) {
      handler("connected");
    }
  }

  disconnect(): void {
    if (this.channel) {
      if (this.boundListener) {
        this.channel.removeEventListener("message", this.boundListener as any);
      }
      this.channel.close();
      this.channel = null;
    }
    this.boundListener = null;
    this._state = "disconnected";
    for (const handler of this.connectionHandlers) {
      handler("disconnected");
    }
  }

  send(event: SyncEvent): void {
    if (this.channel && this._state === "connected") {
      this.channel.postMessage(event);
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
