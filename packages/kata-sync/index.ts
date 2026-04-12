// Types
export type {
  SyncEvent,
  SyncEventType,
  ConnectionState,
  ConnectOptions,
  PlayerInfo,
  ChoicePolicy,
  MultiplayerMode,
  MultiplayerMeta,
  PlayerPosition,
} from "./src/types";

// Transport interface
export type { KataSyncTransport } from "./src/transport";

// Core
export { KataSyncManager } from "./src/sync-manager";
export { AuthorityTracker } from "./src/authority";
export { createSyncEvent } from "./src/sync-event";
export { ChoicePolicyManager } from "./src/choice-policy";
export type { ChoiceResult } from "./src/choice-policy";
export { StatePartition } from "./src/state-partition";

// Transports
export { MockTransport } from "./src/transports/mock";
export { BroadcastChannelTransport } from "./src/transports/broadcast-channel";
export { WebSocketTransport } from "./src/transports/websocket";
export type { WebSocketTransportOptions } from "./src/transports/websocket";
