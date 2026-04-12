import { describe, expect, test } from "bun:test";
import { AuthorityTracker } from "../src/authority";
import type { PlayerInfo } from "../src/types";

describe("AuthorityTracker", () => {
  test("first player added becomes authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    expect(tracker.getAuthorityId()).toBe("p1");
    expect(tracker.isAuthority("p1")).toBe(true);
  });

  test("second player added is not authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    tracker.addPlayer({ id: "p2", connected: true, role: "player", joinedAt: 200 });
    expect(tracker.isAuthority("p1")).toBe(true);
    expect(tracker.isAuthority("p2")).toBe(false);
  });

  test("removing authority migrates to oldest remaining peer", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    tracker.addPlayer({ id: "p2", connected: true, role: "player", joinedAt: 200 });
    tracker.addPlayer({ id: "p3", connected: true, role: "player", joinedAt: 150 });

    const newAuthority = tracker.removePlayer("p1");
    expect(newAuthority).toBe("p3"); // p3 joined at 150, earlier than p2 at 200
    expect(tracker.getAuthorityId()).toBe("p3");
  });

  test("removing non-authority player does not change authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    tracker.addPlayer({ id: "p2", connected: true, role: "player", joinedAt: 200 });

    const newAuthority = tracker.removePlayer("p2");
    expect(newAuthority).toBeNull();
    expect(tracker.getAuthorityId()).toBe("p1");
  });

  test("removing last player returns null authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });

    const newAuthority = tracker.removePlayer("p1");
    expect(newAuthority).toBeNull();
    expect(tracker.getAuthorityId()).toBeNull();
  });

  test("spectators cannot become authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "s1", connected: true, role: "spectator", joinedAt: 100 });
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 200 });

    // spectator was first but player gets authority
    expect(tracker.getAuthorityId()).toBe("p1");
  });

  test("spectator does not inherit authority", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    tracker.addPlayer({ id: "s1", connected: true, role: "spectator", joinedAt: 150 });
    tracker.addPlayer({ id: "p2", connected: true, role: "player", joinedAt: 200 });

    const newAuthority = tracker.removePlayer("p1");
    expect(newAuthority).toBe("p2"); // skips spectator
    expect(tracker.isAuthority("s1")).toBe(false);
  });

  test("getPlayers returns all players", () => {
    const tracker = new AuthorityTracker();
    tracker.addPlayer({ id: "p1", connected: true, role: "player", joinedAt: 100 });
    tracker.addPlayer({ id: "p2", connected: true, role: "player", joinedAt: 200 });

    const players = tracker.getPlayers();
    expect(players).toHaveLength(2);
    // Authority player should have role "authority"
    expect(players.find((p) => p.id === "p1")!.role).toBe("authority");
    expect(players.find((p) => p.id === "p2")!.role).toBe("player");
  });
});
