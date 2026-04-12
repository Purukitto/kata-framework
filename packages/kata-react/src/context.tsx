import React, { createContext, useContext, useRef, type ReactNode } from "react";
import { KataEngine, type KSONScene } from "@kata-framework/core";
import { TweenProvider } from "./TweenContext";

export interface KataContextType {
  engine: KataEngine;
}

const KataContext = createContext<KataContextType | null>(null);

interface KataProviderProps {
  children: ReactNode;
  config?: any;
  initialScenes?: KSONScene[];
}

export function KataProvider({ children, config, initialScenes }: KataProviderProps) {
  const engineRef = useRef<KataEngine | null>(null);

  // Initialize engine only once (persists across renders)
  if (!engineRef.current) {
    engineRef.current = new KataEngine(config);
    if (initialScenes) {
      for (const scene of initialScenes) {
        engineRef.current.registerScene(scene);
      }
    }
  }

  return (
    <KataContext.Provider value={{ engine: engineRef.current }}>
      <TweenProvider>
        {children}
      </TweenProvider>
    </KataContext.Provider>
  );
}

export { KataContext };

export const useKataEngine = (): KataEngine => {
  const context = useContext(KataContext);
  if (!context) {
    throw new Error("useKataEngine must be used within a KataProvider");
  }
  return context.engine;
};
