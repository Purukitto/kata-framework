import type { KSONAction, A11yHints } from "../types";

/**
 * Generates accessibility hints from a KSON action.
 * Pure function — no side effects, no DOM dependency.
 */
export function generateA11yHints(action: KSONAction): A11yHints {
  switch (action.type) {
    case "text":
      return {
        role: "dialog",
        liveRegion: "assertive",
        label: `${action.speaker} says: ${action.content}`,
      };

    case "visual":
      return {
        role: "img",
        description: `Visual: ${action.src}${action.layer !== "background" ? ` on ${action.layer}` : ""}`,
      };

    case "choice":
      return {
        role: "group",
        liveRegion: "polite",
        keyHints: action.choices.map((c, i) => ({
          choiceId: c.id,
          hint: `Press ${i + 1} for ${c.label}`,
        })),
      };

    case "wait":
      return {
        liveRegion: "off",
      };

    case "tween":
      return {
        description: `${action.target} animates ${action.property}`,
        reducedMotion: true,
      };

    case "tween-group":
      return {
        description: `Animation group: ${action.tweens.length} tween${action.tweens.length !== 1 ? "s" : ""} (${action.mode})`,
        reducedMotion: true,
      };

    case "exec":
      return {};

    case "condition":
      return {};

    case "audio":
      return {};

    default:
      return {};
  }
}
