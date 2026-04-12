import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";

export interface TweenContextType {
  subscribe: (callback: () => void) => () => void;
  getStyles: (targetId: string) => CSSProperties | undefined;
  getVersion: () => number;
  update: (styles: Map<string, CSSProperties>) => void;
}

const TweenCtx = createContext<TweenContextType | null>(null);

export function TweenProvider({ children }: { children: ReactNode }) {
  const stylesRef = useRef(new Map<string, CSSProperties>());
  const versionRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const getStyles = useCallback((targetId: string) => {
    return stylesRef.current.get(targetId);
  }, []);

  const getVersion = useCallback(() => versionRef.current, []);

  const update = useCallback((styles: Map<string, CSSProperties>) => {
    stylesRef.current = styles;
    versionRef.current++;
    for (const cb of listenersRef.current) {
      cb();
    }
  }, []);

  const value = useRef<TweenContextType>({ subscribe, getStyles, getVersion, update });

  return (
    <TweenCtx.Provider value={value.current}>
      {children}
    </TweenCtx.Provider>
  );
}

export function useTweenContext(): TweenContextType | null {
  return useContext(TweenCtx);
}
