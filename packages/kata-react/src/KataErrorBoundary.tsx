import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { KataContext } from "./context";
import type { KataEngine } from "@kata-framework/core";
import type { SaveManager } from "./SaveManager";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
  restart: (sceneId?: string) => void;
  loadLastSave: () => boolean;
}

export interface KataErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  engine?: KataEngine;
  saveManager?: SaveManager;
}

interface KataErrorBoundaryState {
  error: Error | null;
}

export class KataErrorBoundary extends Component<KataErrorBoundaryProps, KataErrorBoundaryState> {
  static override contextType = KataContext;
  declare context: React.ContextType<typeof KataContext>;

  override state: KataErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): KataErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private getEngine(): KataEngine | null {
    return this.props.engine ?? this.context?.engine ?? null;
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  private restart = (sceneId?: string): void => {
    const engine = this.getEngine();
    if (engine) {
      const targetScene = sceneId ?? engine.getSnapshot().currentSceneId;
      if (targetScene) {
        engine.start(targetScene);
      }
    }
    this.setState({ error: null });
  };

  private loadLastSave = (): boolean => {
    const { saveManager } = this.props;
    const engine = this.getEngine();

    if (!saveManager || !engine) return false;

    const slots = saveManager.getSlots();
    const filledSlots = slots.filter((s) => !s.isEmpty && s.timestamp != null);

    if (filledSlots.length === 0) return false;

    // Find most recent slot by timestamp
    filledSlots.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    const mostRecent = filledSlots[0]!;

    const snapshot = saveManager.load(mostRecent.index);
    if (!snapshot) return false;

    engine.loadSnapshot(snapshot);
    this.setState({ error: null });
    return true;
  };

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback({
        error: this.state.error,
        reset: this.reset,
        restart: this.restart,
        loadLastSave: this.loadLastSave,
      });
    }
    return this.props.children;
  }
}
