import { useState, useEffect, useCallback, useRef } from "react";
import type { Choice } from "@kata-framework/core";

/**
 * Hook that tracks the user's prefers-reduced-motion setting.
 * Returns true when the user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

/**
 * Hook that provides arrow key + Enter navigation for a list of choices.
 * Returns the focused index and a keydown handler.
 */
export function useKeyboardNavigation(
  choices: Choice[],
  onSelect: (choiceId: string) => void
): {
  focusedIndex: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
} {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, choices.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const choice = choices[focusedIndex];
        if (choice) onSelect(choice.id);
      } else if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < choices.length) {
          e.preventDefault();
          onSelect(choices[idx]!.id);
        }
      }
    },
    [choices, focusedIndex, onSelect]
  );

  // Reset focus when choices change
  useEffect(() => {
    setFocusedIndex(0);
  }, [choices]);

  return { focusedIndex, onKeyDown };
}

/**
 * Hook that auto-focuses the provided ref when the dependency changes.
 * Useful for focusing the "Next" button or first choice on frame change.
 */
export function useFocusManagement(dep: any): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, [dep]);

  return ref;
}
