import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "./a11y";

export interface TypewriterTextProps {
  /** The full text to reveal character-by-character. */
  text: string;
  /** Milliseconds per character. Default: 30 */
  speed?: number;
  /** Fires once when all characters are visible. */
  onComplete?: () => void;
  /** If true, reveal all text instantly. */
  skip?: boolean;
  /** CSS class name for the outer wrapper. */
  className?: string;
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  skip = false,
  className,
}: TypewriterTextProps) {
  const reducedMotion = useReducedMotion();
  const [displayedCount, setDisplayedCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const shouldSkip = skip || reducedMotion;

  // Fire onComplete exactly once per text
  const fireComplete = useCallback(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      setCompleted(true);
      onCompleteRef.current?.();
    }
  }, []);

  // Reset when text changes
  useEffect(() => {
    firedRef.current = false;
    setCompleted(false);
    startTimeRef.current = null;

    if (!text.length || shouldSkip) {
      setDisplayedCount(text.length);
      return;
    }

    setDisplayedCount(0);

    // Cancel any in-progress animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const count = Math.min(Math.floor(elapsed / speed) + 1, text.length);
      setDisplayedCount(count);

      if (count < text.length) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [text, shouldSkip, speed]);

  // Fire completion when all characters are shown
  useEffect(() => {
    if (displayedCount >= text.length && text.length >= 0) {
      fireComplete();
    }
  }, [displayedCount, text.length, fireComplete]);

  const handleClick = useCallback(() => {
    setDisplayedCount(text.length);
    // completion will fire via the displayedCount effect
  }, [text.length]);

  const visible = text.slice(0, displayedCount);
  const hidden = text.slice(displayedCount);

  return (
    <span
      className={className}
      onClick={handleClick}
      aria-label={text}
      aria-live={completed ? "polite" : "off"}
      role="text"
      style={{ cursor: completed ? "default" : "pointer" }}
    >
      <span aria-hidden="true">{visible}</span>
      {hidden && (
        <span aria-hidden="true" style={{ visibility: "hidden" }}>
          {hidden}
        </span>
      )}
    </span>
  );
}
