import { useState, useCallback } from "react";

interface MultiplayerLobbyProps {
  onJoin: (roomId: string) => void;
  onBack: () => void;
}

export function MultiplayerLobby({ onJoin, onBack }: MultiplayerLobbyProps) {
  const [roomId, setRoomId] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = roomId.trim() || `room-${Date.now()}`;
      onJoin(id);
    },
    [roomId, onJoin]
  );

  return (
    <div className="mp-lobby">
      <div className="mp-lobby__card">
        <h2 className="mp-lobby__title">Co-op Broadcast</h2>
        <p className="mp-lobby__desc">
          Two operators. One signal. Enter a room name to join — or leave blank to create a new room.
        </p>
        <form onSubmit={handleSubmit} className="mp-lobby__form">
          <input
            className="mp-lobby__input"
            type="text"
            placeholder="Room name (e.g. studio-7)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus
            aria-label="Room name"
          />
          <button type="submit" className="mp-lobby__join-btn">
            Join Room
          </button>
        </form>
        <button className="mp-lobby__back-btn" onClick={onBack}>
          Back to Solo
        </button>
      </div>
    </div>
  );
}
