import type { SyncEvent, ConnectionState } from "./types";

export interface KataSyncTransport {
  send(event: SyncEvent): void;
  onReceive(handler: (event: SyncEvent) => void): void;
  offReceive(handler: (event: SyncEvent) => void): void;
  onConnectionChange(handler: (state: ConnectionState) => void): void;
  connect(roomId: string): Promise<void>;
  disconnect(): void;
  readonly state: ConnectionState;
}
