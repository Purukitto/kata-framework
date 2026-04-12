import type { KataSyncTransport } from "../transport";
import type { SyncEvent, ConnectionState } from "../types";

export class MockTransport implements KataSyncTransport {
  private _state: ConnectionState = "disconnected";
  private receiveHandlers: Set<(event: SyncEvent) => void> = new Set();
  private connectionHandlers: Set<(state: ConnectionState) => void> = new Set();
  private peers: Set<MockTransport> = new Set();

  get state(): ConnectionState {
    return this._state;
  }

  static link(...transports: MockTransport[]): void {
    for (const t of transports) {
      for (const other of transports) {
        if (t !== other) {
          t.peers.add(other);
        }
      }
    }
  }

  async connect(roomId: string): Promise<void> {
    this._state = "connected";
    for (const handler of this.connectionHandlers) {
      handler("connected");
    }
  }

  disconnect(): void {
    this._state = "disconnected";
    for (const handler of this.connectionHandlers) {
      handler("disconnected");
    }
  }

  send(event: SyncEvent): void {
    for (const peer of this.peers) {
      if (peer._state === "connected") {
        for (const handler of peer.receiveHandlers) {
          handler(event);
        }
      }
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
