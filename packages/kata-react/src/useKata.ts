import { useState, useEffect } from "react";
import { useKataEngine } from "./context";
import type { KSONFrame } from "kata-core/src/types";

export function useKata() {
  const engine = useKataEngine();
  const [frame, setFrame] = useState<KSONFrame | null>(null);
  const [loading, setLoading] = useState(false);

  // Subscribe to engine events
  useEffect(() => {
    const handleUpdate = (updatedFrame: KSONFrame) => {
      setFrame(updatedFrame);
      setLoading(false);
    };

    const handleEnd = () => {
      setLoading(false);
    };

    engine.on("update", handleUpdate);
    engine.on("end", handleEnd);

    return () => {
      engine.off("update", handleUpdate);
      engine.off("end", handleEnd);
    };
  }, [engine]);

  // Wrapper functions for engine actions
  // These trigger state updates via event listeners (Single Source of Truth)
  const actions = {
    next: () => {
      engine.next();
    },
    start: (id: string) => {
      setLoading(true);
      engine.start(id);
    },
    makeChoice: (id: string) => {
      // @ts-expect-error - makeChoice may not exist yet on KataEngine
      engine.makeChoice(id);
    },
  };

  return {
    frame,
    state: frame?.state ?? null,
    actions,
  };
}
