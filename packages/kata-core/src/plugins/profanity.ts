import type { KSONAction, Choice } from "../types";
import type { KataPlugin } from "../runtime/plugin";

export interface ProfanityConfig {
  words: string[];
  replacement?: string | ((word: string) => string) | "mask";
  scope?: "text" | "choice" | "all";
  partialMatch?: boolean;
}

export interface ProfanityPlugin extends KataPlugin {
  addWords(words: string[]): void;
  removeWords(words: string[]): void;
  getWords(): string[];
}

export function profanityPlugin(config: ProfanityConfig): ProfanityPlugin {
  const words = new Set(config.words.map((w) => w.toLowerCase()));
  const scope = config.scope ?? "all";
  const partialMatch = config.partialMatch ?? false;
  const replacement = config.replacement ?? "***";

  function buildPattern(): RegExp | null {
    const wordList = [...words];
    if (wordList.length === 0) return null;
    const escaped = wordList.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = partialMatch ? escaped.join("|") : escaped.map((w) => `\\b${w}\\b`).join("|");
    return new RegExp(pattern, "gi");
  }

  function replace(text: string): string {
    const pattern = buildPattern();
    if (!pattern) return text;
    return text.replace(pattern, (matched) => {
      if (replacement === "mask") {
        return "*".repeat(matched.length);
      }
      if (typeof replacement === "function") {
        return replacement(matched);
      }
      return replacement;
    });
  }

  function processAction(action: KSONAction): KSONAction {
    if (action.type === "text" && (scope === "text" || scope === "all")) {
      return { ...action, content: replace(action.content) };
    }
    if (action.type === "choice" && (scope === "choice" || scope === "all")) {
      const choices = action.choices.map((c: Choice) => ({
        ...c,
        label: replace(c.label),
      }));
      return { ...action, choices };
    }
    return action;
  }

  return {
    name: "profanity-filter",

    beforeAction(action: KSONAction, _ctx: Record<string, any>): KSONAction | null {
      return processAction(action);
    },

    addWords(newWords: string[]): void {
      for (const w of newWords) words.add(w.toLowerCase());
    },

    removeWords(removeList: string[]): void {
      for (const w of removeList) words.delete(w.toLowerCase());
    },

    getWords(): string[] {
      return [...words];
    },
  };
}
