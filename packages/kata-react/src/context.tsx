import React, { createContext, useContext, useRef, type ReactNode } from "react";
import { KataEngine } from "kata-core/src/runtime";

interface KataContextType {
  engine: KataEngine;
}

const KataContext = createContext<KataContextType | null>(null);

interface KataProviderProps {
  children: ReactNode;
  config?: any;
}

export function KataProvider({ children, config }: KataProviderProps) {
  const engineRef = useRef<KataEngine | null>(null);

  // Initialize engine only once (persists across renders)
  if (!engineRef.current) {
    engineRef.current = new KataEngine(config);
  }

  return (
    <KataContext.Provider value={{ engine: engineRef.current }}>
      {children}
    </KataContext.Provider>
  );
}

export const useKataEngine = (): KataEngine => {
  const context = useContext(KataContext);
  if (!context) {
    throw new Error("useKataEngine must be used within a KataProvider");
  }
  return context.engine;
};
