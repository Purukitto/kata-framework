import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { Playground } from "./Playground";

export interface PlaygroundOptions {
  scene: string;
  height?: number;
  showKson?: boolean;
  showEvents?: boolean;
  onReset?: () => void;
}

export interface PlaygroundHandle {
  unmount(): void;
  setScene(src: string): void;
  reset(): void;
}

export function mount(target: HTMLElement, options: PlaygroundOptions): PlaygroundHandle {
  const root: Root = createRoot(target);

  let api: { setScene: (s: string) => void; reset: () => void } | null = null;

  root.render(
    <Playground
      initialScene={options.scene}
      height={options.height ?? 480}
      showKson={options.showKson ?? true}
      showEvents={options.showEvents ?? true}
      onReset={options.onReset}
      controlRef={(next) => {
        api = next;
      }}
    />,
  );

  return {
    unmount() {
      root.unmount();
    },
    setScene(src: string) {
      api?.setScene(src);
    },
    reset() {
      api?.reset();
    },
  };
}
