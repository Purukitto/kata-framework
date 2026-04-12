import React, { useSyncExternalStore, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useTweenContext } from "./TweenContext";

export interface TweenTargetProps {
  /** Target ID — matches the `target` field in tween KSON actions. */
  id: string;
  children: ReactNode;
  /** Additional inline styles (tween styles take precedence). */
  style?: CSSProperties;
  className?: string;
  /** Element type to render. Default: "div" */
  as?: ElementType;
}

/**
 * A wrapper component that receives tween styles from useTween
 * via TweenContext. Renders normally if no tween targets this ID.
 */
export function TweenTarget({
  id,
  children,
  style,
  className,
  as: Component = "div",
}: TweenTargetProps) {
  const ctx = useTweenContext();

  const subscribe = ctx?.subscribe ?? ((cb: () => void) => () => {});
  const getSnapshot = () => ctx?.getVersion() ?? 0;

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const tweenStyles = ctx?.getStyles(id);
  const mergedStyles: CSSProperties = tweenStyles
    ? { ...style, ...tweenStyles }
    : style ?? {};

  return (
    <Component className={className} style={mergedStyles}>
      {children}
    </Component>
  );
}
