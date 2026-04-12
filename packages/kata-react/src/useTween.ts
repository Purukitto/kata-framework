import { useEffect } from "react";
import { useReducedMotion } from "./a11y";
import { useTweenContext } from "./TweenContext";
import type { KSONFrame } from "@kata-framework/core";
import type { CSSProperties } from "react";

/** Maps KSON tween property names to CSS. */
function buildTweenStyles(
  property: string,
  to: number,
  duration: number,
  easing: string,
  reducedMotion: boolean,
  existing?: CSSProperties
): CSSProperties {
  const styles: CSSProperties = { ...existing };

  // Build transform string by appending to existing transforms
  const existingTransform = (styles.transform as string) ?? "";

  switch (property) {
    case "x":
      styles.transform = `${existingTransform} translateX(${to}px)`.trim();
      break;
    case "y":
      styles.transform = `${existingTransform} translateY(${to}px)`.trim();
      break;
    case "scale":
      styles.transform = `${existingTransform} scale(${to})`.trim();
      break;
    case "rotation":
      styles.transform = `${existingTransform} rotate(${to}deg)`.trim();
      break;
    case "opacity":
      styles.opacity = to;
      break;
    default:
      // For unknown properties, attempt to set directly
      (styles as any)[property] = to;
      break;
  }

  if (reducedMotion) {
    styles.transition = "none";
  } else {
    // Determine which CSS property to transition
    const cssProp = property === "opacity" ? "opacity" : "transform";
    const existingTransition = (styles.transition as string) ?? "";
    const newTransition = `${cssProp} ${duration}ms ${easing}`;
    styles.transition = existingTransition
      ? `${existingTransition}, ${newTransition}`
      : newTransition;
  }

  return styles;
}

/**
 * Hook that interprets tween/tween-group frames and pushes
 * CSS styles into TweenContext for TweenTarget components to consume.
 */
export function useTween(frame: KSONFrame | null): void {
  const ctx = useTweenContext();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!ctx || !frame) return;

    const action = frame.action;

    if (action.type === "tween") {
      const styles = new Map<string, CSSProperties>();
      styles.set(
        action.target,
        buildTweenStyles(
          action.property,
          action.to,
          action.duration,
          action.easing ?? "ease",
          reducedMotion
        )
      );
      ctx.update(styles);
    } else if (action.type === "tween-group") {
      const styles = new Map<string, CSSProperties>();
      for (const tween of action.tweens) {
        const existing = styles.get(tween.target);
        styles.set(
          tween.target,
          buildTweenStyles(
            tween.property,
            tween.to,
            tween.duration,
            tween.easing ?? "ease",
            reducedMotion,
            existing
          )
        );
      }
      ctx.update(styles);
    }
  }, [frame, ctx, reducedMotion]);
}
