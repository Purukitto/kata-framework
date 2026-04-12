interface PlayerInfo {
  id: string;
  connected: boolean;
  role: "authority" | "player" | "spectator";
  joinedAt: number;
}

interface PlayerPresenceBarProps {
  players: PlayerInfo[];
  localPlayerId: string;
  connectionState: string;
}

export function PlayerPresenceBar({ players, localPlayerId, connectionState }: PlayerPresenceBarProps) {
  return (
    <div className="presence-bar" role="status" aria-label="Connected players">
      <div className="presence-bar__status">
        <span className={`presence-bar__dot presence-bar__dot--${connectionState}`} />
        <span className="presence-bar__state">{connectionState}</span>
      </div>
      <div className="presence-bar__players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`presence-bar__player ${p.id === localPlayerId ? "presence-bar__player--local" : ""}`}
            title={`${p.id}${p.role === "authority" ? " (host)" : ""}`}
          >
            <span className={`presence-bar__player-dot ${p.connected ? "presence-bar__player-dot--connected" : ""}`} />
            <span className="presence-bar__player-name">
              {p.id === localPlayerId ? "You" : p.id.slice(0, 6)}
            </span>
            {p.role === "authority" && (
              <span className="presence-bar__badge">HOST</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
