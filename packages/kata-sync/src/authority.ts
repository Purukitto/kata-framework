import type { PlayerInfo } from "./types";

export class AuthorityTracker {
  private players: Map<string, PlayerInfo> = new Map();
  private authorityId: string | null = null;

  addPlayer(info: PlayerInfo): void {
    this.players.set(info.id, { ...info });
    if (this.authorityId === null && info.role !== "spectator") {
      this.authorityId = info.id;
    }
  }

  /** Removes a player. Returns the new authority ID if authority migrated, null otherwise. */
  removePlayer(playerId: string): string | null {
    this.players.delete(playerId);

    if (this.authorityId === playerId) {
      // Migrate authority to oldest non-spectator peer
      const candidates = [...this.players.values()]
        .filter((p) => p.role !== "spectator")
        .sort((a, b) => a.joinedAt - b.joinedAt);

      const newAuthority = candidates[0] ?? null;
      this.authorityId = newAuthority?.id ?? null;
      return this.authorityId;
    }

    return null;
  }

  getAuthorityId(): string | null {
    return this.authorityId;
  }

  isAuthority(playerId: string): boolean {
    return this.authorityId === playerId;
  }

  getPlayers(): PlayerInfo[] {
    return [...this.players.values()].map((p) => ({
      ...p,
      role: p.id === this.authorityId ? "authority" : p.role,
    }));
  }
}
