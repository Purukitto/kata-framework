import { createContext, useContext, useRef, type ReactNode } from "react";
import type { KataEngine } from "@kata-framework/core";
import type { KataSyncManager } from "@kata-framework/sync";
import type { KataSyncTransport } from "@kata-framework/sync";

interface KataMultiplayerContextType {
  syncManager: KataSyncManager;
}

const KataMultiplayerContext = createContext<KataMultiplayerContextType | null>(null);

export interface KataMultiplayerProviderProps {
  children: ReactNode;
  syncManager: KataSyncManager;
}

export function KataMultiplayerProvider({
  children,
  syncManager,
}: KataMultiplayerProviderProps) {
  return (
    <KataMultiplayerContext.Provider value={{ syncManager }}>
      {children}
    </KataMultiplayerContext.Provider>
  );
}

export function useKataSyncManager(): KataSyncManager {
  const context = useContext(KataMultiplayerContext);
  if (!context) {
    throw new Error(
      "useKataSyncManager must be used within a KataMultiplayerProvider",
    );
  }
  return context.syncManager;
}
