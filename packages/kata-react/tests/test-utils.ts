import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";

/**
 * Mock window.matchMedia for reduced-motion tests.
 * Returns a cleanup function that restores the original.
 */
export function mockMatchMedia(matches: boolean): () => void {
  const original = window.matchMedia;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();

  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  return () => {
    window.matchMedia = original;
  };
}

/**
 * Render a React element into a fresh container and return root + container.
 */
export function renderToContainer(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(element);
  return {
    root,
    container,
    unmount() {
      root.unmount();
      container.remove();
    },
  };
}

/**
 * Flush pending requestAnimationFrame callbacks by advancing time.
 */
export function flushRAF(count = 1) {
  for (let i = 0; i < count; i++) {
    // happy-dom supports rAF; trigger by running pending callbacks
    (globalThis as any).__happyDOMSettings__?.timer?.tick?.(16);
  }
}

/**
 * Wait for microtasks + rAF to settle.
 */
export async function waitFor(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-memory StorageAdapter for testing SaveManager without localStorage.
 */
export function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    /** Test helper: see all stored keys */
    _keys(): string[] {
      return [...store.keys()];
    },
    /** Test helper: clear everything */
    _clear(): void {
      store.clear();
    },
  };
}
