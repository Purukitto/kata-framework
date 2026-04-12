import { describe, expect, test } from "bun:test";
import { ChoicePolicyManager } from "../src/choice-policy";

describe("ChoicePolicyManager", () => {
  describe("first-writer", () => {
    test("first choice wins, subsequent are discarded", () => {
      const manager = new ChoicePolicyManager({ type: "first-writer" });
      manager.startCollection("action-1");

      const r1 = manager.submitChoice("action-1", "p1", "choice-a");
      expect(r1).toEqual({ resolved: true, choiceId: "choice-a" });

      const r2 = manager.submitChoice("action-1", "p2", "choice-b");
      expect(r2).toEqual({ resolved: false, reason: "already-resolved" });
    });

    test("different actions are independent", () => {
      const manager = new ChoicePolicyManager({ type: "first-writer" });
      manager.startCollection("action-1");
      manager.startCollection("action-2");

      manager.submitChoice("action-1", "p1", "choice-a");
      const r2 = manager.submitChoice("action-2", "p2", "choice-b");
      expect(r2).toEqual({ resolved: true, choiceId: "choice-b" });
    });
  });

  describe("designated", () => {
    test("only designated player's choice is accepted", () => {
      const manager = new ChoicePolicyManager({ type: "designated", playerId: "dm" });
      manager.startCollection("action-1");

      const r1 = manager.submitChoice("action-1", "p1", "choice-a");
      expect(r1).toEqual({ resolved: false, reason: "not-designated" });

      const r2 = manager.submitChoice("action-1", "dm", "choice-b");
      expect(r2).toEqual({ resolved: true, choiceId: "choice-b" });
    });
  });

  describe("vote", () => {
    test("collects votes and resolves with resolver function", async () => {
      const resolver = (votes: Map<string, string>) => {
        // Majority wins
        const counts = new Map<string, number>();
        for (const choiceId of votes.values()) {
          counts.set(choiceId, (counts.get(choiceId) ?? 0) + 1);
        }
        let best = "";
        let max = 0;
        for (const [id, count] of counts) {
          if (count > max) {
            best = id;
            max = count;
          }
        }
        return best;
      };

      const manager = new ChoicePolicyManager({
        type: "vote",
        timeout: 100,
        resolver,
      });
      manager.startCollection("action-1");

      manager.submitChoice("action-1", "p1", "choice-a");
      manager.submitChoice("action-1", "p2", "choice-b");
      manager.submitChoice("action-1", "p3", "choice-a");

      const result = await manager.resolveVote("action-1");
      expect(result).toBe("choice-a"); // 2 vs 1
    });

    test("timeout resolves with available votes", async () => {
      const resolver = (votes: Map<string, string>) => {
        return votes.values().next().value ?? "";
      };

      const manager = new ChoicePolicyManager({
        type: "vote",
        timeout: 50,
        resolver,
      });
      manager.startCollection("action-1");
      manager.submitChoice("action-1", "p1", "choice-a");

      // Wait for timeout
      await new Promise((r) => setTimeout(r, 80));
      const result = await manager.resolveVote("action-1");
      expect(result).toBe("choice-a");
    });
  });

  test("policy can change mid-session", () => {
    const manager = new ChoicePolicyManager({ type: "first-writer" });
    manager.startCollection("action-1");

    manager.submitChoice("action-1", "p1", "choice-a");

    manager.setPolicy({ type: "designated", playerId: "dm" });
    manager.startCollection("action-2");

    const r = manager.submitChoice("action-2", "p1", "choice-b");
    expect(r).toEqual({ resolved: false, reason: "not-designated" });
  });
});
