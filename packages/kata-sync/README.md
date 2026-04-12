# @kata-framework/sync

Multiplayer sync layer for the [Kata Framework](https://github.com/purukitto/kata-framework). Wraps `KataEngine` with a host-authoritative model to enable shared narrative experiences -- from two browser tabs to networked rooms.

## Install

```bash
bun add @kata-framework/sync
```

## Quick Start -- BroadcastChannel (same device)

```ts
import { KataEngine } from "@kata-framework/core";
import { KataSyncManager, BroadcastChannelTransport } from "@kata-framework/sync";

const engine = new KataEngine();
engine.registerScene(myScene);

const transport = new BroadcastChannelTransport();
const sync = new KataSyncManager(engine, transport);

await sync.connect("my-room", { playerId: "player-1" });
// First to connect becomes the authority automatically

sync.on("frame", (frame) => {
  // Render the frame -- works on both authority and followers
});

sync.start("intro"); // Authority runs the engine, followers receive frames
```

## Quick Start -- WebSocket (networked)

**Server:**

```ts
import { KataServer } from "@kata-framework/sync/server";

const server = new KataServer({ port: 3000 });
server.start();

server.on("room-created", (roomId) => console.log(`Room: ${roomId}`));
server.on("player-joined", (roomId, playerId) => console.log(`${playerId} joined ${roomId}`));
```

**Client:**

```ts
import { WebSocketTransport } from "@kata-framework/sync";

const transport = new WebSocketTransport("ws://localhost:3000", {
  playerId: "player-1",
  scenes: [myScene], // Scenes are registered on the server's engine
});
```

## Authority Model

- **Host-authoritative**: One node runs the real `KataEngine`. Others send intents and receive frame broadcasts.
- **Automatic authority**: First non-spectator to connect becomes authority.
- **Authority migration**: If the authority disconnects, the oldest remaining peer inherits.

## Choice Policies

```ts
sync.setChoicePolicy({ type: "first-writer" });          // First click wins
sync.setChoicePolicy({ type: "designated", playerId: "dm" }); // DM mode
sync.setChoicePolicy({
  type: "vote",
  timeout: 10000,
  resolver: (votes) => /* majority wins */,
});
```

## Player Presence

```ts
sync.on("player-joined", (info) => console.log(`${info.id} joined`));
sync.on("player-left", (info) => console.log(`${info.id} left`));
sync.getPlayers(); // [{ id, connected, role, joinedAt }]
```

## State Partitioning

For advanced branching narratives where players explore independently:

```ts
import { StatePartition } from "@kata-framework/sync";

const partition = new StatePartition();
partition.setMode("branching");
partition.setPlayerSnapshot("p1", snapshot);
partition.getPlayerPosition("p1"); // { sceneId, actionIndex }
partition.getSharedCtx();          // Shared state visible to all
partition.getPlayerCtx("p1");      // Player-isolated state
```

**Sync points** let branches reconverge:

```ts
partition.registerSyncPoint("forest", "boss-fight");
partition.arriveAtSyncPoint("boss-fight", "p1", totalPlayers);
```

## React Integration

```tsx
import { useKataMultiplayer, KataMultiplayerProvider } from "@kata-framework/react";

function Game() {
  const { frame, players, isAuthority, actions } = useKataMultiplayer(syncManager);
  // ...
}
```

## API Reference

### KataSyncManager

| Method | Description |
|--------|-------------|
| `connect(roomId, options?)` | Join a room |
| `disconnect()` | Leave the room |
| `start(sceneId)` | Start a scene (authority runs, follower sends intent) |
| `next()` | Advance (authority runs, follower sends intent) |
| `makeChoice(choiceId)` | Make a choice (authority runs, follower sends intent) |
| `setChoicePolicy(policy)` | Set the choice resolution policy |
| `getPlayers()` | Get the current player roster |
| `getSnapshot()` | Get the engine's game state snapshot |
| `isHost` | Whether this node is the authority |
| `connectionState` | Current connection state |
| `playerId` | This node's player ID |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `frame` | `KSONFrame` | A new frame to render |
| `end` | `{ sceneId }` | Scene ended |
| `player-joined` | `PlayerInfo` | A player connected |
| `player-left` | `{ id }` | A player disconnected |
| `authority-changed` | `{ newAuthorityId }` | Authority migrated |

### Transports

| Transport | Use Case |
|-----------|----------|
| `MockTransport` | Testing (in-process, synchronous) |
| `BroadcastChannelTransport` | Same-device (browser tabs) |
| `WebSocketTransport` | Networked (requires `KataServer`) |
