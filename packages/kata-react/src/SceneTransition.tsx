import React, { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { useReducedMotion } from "./a11y";

export type TransitionType = "fade" | "slide-left" | "dissolve" | "none";

export interface SceneTransitionProps {
  /** Current scene ID — changes trigger transitions. */
  sceneId: string;
  /** Transition style. Default: "fade" */
  transition?: TransitionType;
  /** Transition duration in ms. Default: 500 */
  duration?: number;
  children: ReactNode;
}

interface TransitionEntry {
  key: string;
  children: ReactNode;
  phase: "entering" | "active" | "exiting";
}

function getEnterStartStyles(type: TransitionType): CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: 0 };
    case "slide-left":
      return { transform: "translateX(100%)" };
    case "dissolve":
      return { opacity: 0, transform: "scale(0.98)" };
    case "none":
    default:
      return {};
  }
}

function getEnterEndStyles(type: TransitionType): CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: 1 };
    case "slide-left":
      return { transform: "translateX(0)" };
    case "dissolve":
      return { opacity: 1, transform: "scale(1)" };
    case "none":
    default:
      return {};
  }
}

function getExitStyles(type: TransitionType): CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: 0 };
    case "slide-left":
      return { transform: "translateX(-100%)" };
    case "dissolve":
      return { opacity: 0, transform: "scale(1.02)" };
    case "none":
    default:
      return {};
  }
}

function getTransitionProperty(type: TransitionType, duration: number): string {
  switch (type) {
    case "fade":
      return `opacity ${duration}ms ease`;
    case "slide-left":
      return `transform ${duration}ms ease`;
    case "dissolve":
      return `opacity ${duration}ms ease, transform ${duration}ms ease`;
    case "none":
    default:
      return "none";
  }
}

const wrapperStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  width: "100%",
  height: "100%",
};

const layerStyle: CSSProperties = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
};

export function SceneTransition({
  sceneId,
  transition = "fade",
  duration = 500,
  children,
}: SceneTransitionProps) {
  const reducedMotion = useReducedMotion();
  const skipTransition = reducedMotion || transition === "none";

  const [entries, setEntries] = useState<TransitionEntry[]>([
    { key: sceneId, children, phase: "active" },
  ]);

  const prevSceneRef = useRef(sceneId);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rafRef = useRef<number | null>(null);

  // Handle scene changes
  useEffect(() => {
    if (sceneId === prevSceneRef.current) {
      // Same scene — just update children
      setEntries((prev) =>
        prev.map((e) => (e.key === sceneId ? { ...e, children } : e))
      );
      return;
    }

    prevSceneRef.current = sceneId;

    if (skipTransition) {
      // Instant swap
      setEntries([{ key: sceneId, children, phase: "active" }]);
      return;
    }

    // Start transition: move current to exiting, add new as entering
    setEntries((prev) => {
      // Remove any already-exiting entries
      const current = prev.filter((e) => e.phase !== "exiting");
      const exiting = current.map((e) => ({ ...e, phase: "exiting" as const }));
      return [
        ...exiting,
        { key: sceneId, children, phase: "entering" as const },
      ];
    });

    // Double-rAF to transition entering → active (ensures browser paints initial state)
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setEntries((prev) =>
          prev.map((e) =>
            e.phase === "entering" ? { ...e, phase: "active" } : e
          )
        );
        rafRef.current = null;
      });
      rafRef.current = raf2;
    });
    rafRef.current = raf1;

    // Remove exiting entries after duration
    const timeout = setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.phase !== "exiting"));
      timeoutsRef.current.delete(timeout);
    }, duration + 50);
    timeoutsRef.current.add(timeout);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sceneId, children, skipTransition, duration]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) {
        clearTimeout(t);
      }
      timeoutsRef.current.clear();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Single entry, no transition needed — render directly
  if (entries.length === 1 && entries[0]!.phase === "active") {
    return <>{entries[0]!.children}</>;
  }

  return (
    <div style={wrapperStyle}>
      {entries.map((entry) => {
        let entryStyles: CSSProperties;

        if (entry.phase === "entering") {
          entryStyles = {
            ...layerStyle,
            ...getEnterStartStyles(transition),
            transition: getTransitionProperty(transition, duration),
          };
        } else if (entry.phase === "exiting") {
          entryStyles = {
            ...layerStyle,
            ...getExitStyles(transition),
            transition: getTransitionProperty(transition, duration),
          };
        } else {
          // active
          entryStyles = {
            ...layerStyle,
            ...getEnterEndStyles(transition),
            transition: getTransitionProperty(transition, duration),
          };
        }

        return (
          <div key={entry.key} style={entryStyles}>
            {entry.children}
          </div>
        );
      })}
    </div>
  );
}
