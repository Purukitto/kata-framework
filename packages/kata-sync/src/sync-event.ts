import type { SyncEvent, SyncEventType } from "./types";

export function createSyncEvent(
  type: SyncEventType,
  payload: unknown,
  playerId: string,
  seq: number,
): SyncEvent {
  return {
    type,
    payload,
    playerId,
    seq,
    timestamp: Date.now(),
  };
}
