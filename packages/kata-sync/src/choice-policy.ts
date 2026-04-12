import type { ChoicePolicy } from "./types";

export interface ChoiceResult {
  resolved: boolean;
  choiceId?: string;
  reason?: string;
}

export class ChoicePolicyManager {
  private policy: ChoicePolicy;
  private resolved: Map<string, string> = new Map(); // actionKey → choiceId
  private votes: Map<string, Map<string, string>> = new Map(); // actionKey → (playerId → choiceId)

  constructor(policy: ChoicePolicy) {
    this.policy = policy;
  }

  setPolicy(policy: ChoicePolicy): void {
    this.policy = policy;
  }

  startCollection(actionKey: string): void {
    this.resolved.delete(actionKey);
    this.votes.set(actionKey, new Map());
  }

  submitChoice(actionKey: string, playerId: string, choiceId: string): ChoiceResult {
    if (this.policy.type === "first-writer") {
      if (this.resolved.has(actionKey)) {
        return { resolved: false, reason: "already-resolved" };
      }
      this.resolved.set(actionKey, choiceId);
      return { resolved: true, choiceId };
    }

    if (this.policy.type === "designated") {
      if (playerId !== this.policy.playerId) {
        return { resolved: false, reason: "not-designated" };
      }
      this.resolved.set(actionKey, choiceId);
      return { resolved: true, choiceId };
    }

    if (this.policy.type === "vote") {
      const actionVotes = this.votes.get(actionKey);
      if (actionVotes) {
        actionVotes.set(playerId, choiceId);
      }
      return { resolved: false, reason: "collecting-votes" };
    }

    return { resolved: false, reason: "unknown-policy" };
  }

  async resolveVote(actionKey: string): Promise<string> {
    if (this.policy.type !== "vote") {
      throw new Error("resolveVote called on non-vote policy");
    }

    const actionVotes = this.votes.get(actionKey) ?? new Map();
    return this.policy.resolver(actionVotes);
  }
}
