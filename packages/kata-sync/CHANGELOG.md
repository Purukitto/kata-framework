# @kata-framework/sync

## 1.0.0

### Major Changes

- ff1d22d: Stable v1.0.0 release. `KataSyncManager`, `KataSyncTransport`, the built-in BroadcastChannel and WebSocket transports, authority tracking, choice policies, state partitioning, and the `KataServer` / `Room` server subpath are now frozen. Future breaking changes require a new major version.

### Patch Changes

- Updated dependencies [ff1d22d]
  - @kata-framework/core@1.0.0

## 0.2.2

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.8.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.7.0

## 0.2.0

### Minor Changes

- feat: Phase 5 — Multiplayer (v0.6.0)

  New `@kata-framework/sync` package with host-authoritative multiplayer:

  - Sync protocol with `SyncEvent` types and `KataSyncTransport` interface
  - `KataSyncManager` wraps `KataEngine` for authority/follower routing
  - `BroadcastChannelTransport` for same-device multiplayer (browser tabs)
  - `WebSocketTransport` + `KataServer` for networked rooms
  - Choice policies: first-writer, designated player, vote with timeout
  - Player presence: join/leave events, roster, spectator mode
  - `StatePartition` for shared vs branching modes with sync point barriers
  - Authority migration: oldest non-spectator peer inherits on disconnect

  `@kata-framework/core`: Added optional `multiplayer` field to `KSONMeta` and `MultiplayerMeta` type.

  `@kata-framework/react`: Added `useKataMultiplayer()` hook and `KataMultiplayerProvider` context.

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.6.0
