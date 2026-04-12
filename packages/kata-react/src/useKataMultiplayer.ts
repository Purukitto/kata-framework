import { useSyncExternalStore, useCallback, useRef } from "react";
import type { KSONFrame } from "@kata-framework/core";
import type { KataSyncManager } from "@kata-framework/sync";
import type { PlayerInfo, ConnectionState, ChoicePolicy } from "@kata-framework/sync";

interface MultiplayerState {
  frame: KSONFrame | null;
  ended: boolean;
  players: PlayerInfo[];
  isAuthority: boolean;
  connectionState: ConnectionState;
}

export function useKataMultiplayer(syncManager: KataSyncManager) {
  const stateRef = useRef<MultiplayerState>({
    frame: null,
    ended: false,
    players: [],
    isAuthority: false,
    connectionState: "disconnected",
  });
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const update = () => {
        versionRef.current++;
        onStoreChange();
      };

      const handleFrame = (frame: KSONFrame) => {
        stateRef.current = {
          ...stateRef.current,
          frame,
          ended: false,
          isAuthority: syncManager.isHost,
          connectionState: syncManager.connectionState,
        };
        update();
      };

      const handleEnd = () => {
        stateRef.current = { ...stateRef.current, ended: true };
        update();
      };

      const handlePlayerChange = () => {
        stateRef.current = {
          ...stateRef.current,
          players: syncManager.getPlayers(),
          isAuthority: syncManager.isHost,
        };
        update();
      };

      const handleAuthorityChanged = () => {
        stateRef.current = {
          ...stateRef.current,
          isAuthority: syncManager.isHost,
          players: syncManager.getPlayers(),
        };
        update();
      };

      syncManager.on("frame", handleFrame);
      syncManager.on("end", handleEnd);
      syncManager.on("player-joined", handlePlayerChange);
      syncManager.on("player-left", handlePlayerChange);
      syncManager.on("authority-changed", handleAuthorityChanged);

      return () => {
        syncManager.off("frame", handleFrame);
        syncManager.off("end", handleEnd);
        syncManager.off("player-joined", handlePlayerChange);
        syncManager.off("player-left", handlePlayerChange);
        syncManager.off("authority-changed", handleAuthorityChanged);
      };
    },
    [syncManager],
  );

  const getSnapshotFn = useCallback(() => stateRef.current, []);
  const state = useSyncExternalStore(subscribe, getSnapshotFn, getSnapshotFn);

  const start = useCallback((id: string) => syncManager.start(id), [syncManager]);
  const next = useCallback(() => syncManager.next(), [syncManager]);
  const makeChoice = useCallback((id: string) => syncManager.makeChoice(id), [syncManager]);
  const connect = useCallback(
    (roomId: string, options?: any) => syncManager.connect(roomId, options),
    [syncManager],
  );
  const disconnect = useCallback(() => syncManager.disconnect(), [syncManager]);
  const setChoicePolicy = useCallback(
    (policy: ChoicePolicy) => syncManager.setChoicePolicy(policy),
    [syncManager],
  );

  return {
    frame: state.frame,
    state: state.frame?.state ?? null,
    ended: state.ended,
    players: state.players,
    isAuthority: state.isAuthority,
    connectionState: state.connectionState,
    actions: {
      start,
      next,
      makeChoice,
      connect,
      disconnect,
      setChoicePolicy,
    },
  };
}
