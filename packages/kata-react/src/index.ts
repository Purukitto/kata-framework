// Export everything from context
export * from "./context";

// Export everything from useKata
export * from "./useKata";

// Export KataDebug component
export { KataDebug } from "./KataDebug";

// Export accessibility hooks
export { useReducedMotion, useKeyboardNavigation, useFocusManagement } from "./a11y";

// Export multiplayer hooks and context
export { useKataMultiplayer } from "./useKataMultiplayer";
export { KataMultiplayerProvider, useKataSyncManager } from "./multiplayerContext";
export type { KataMultiplayerProviderProps } from "./multiplayerContext";

// Typewriter text
export { TypewriterText } from "./TypewriterText";
export type { TypewriterTextProps } from "./TypewriterText";

// Scene transitions
export { SceneTransition } from "./SceneTransition";
export type { SceneTransitionProps, TransitionType } from "./SceneTransition";

// Tween rendering
export { TweenProvider } from "./TweenContext";
export { useTween } from "./useTween";
export { TweenTarget } from "./TweenTarget";
export type { TweenTargetProps } from "./TweenTarget";

// Save management
export { SaveManager } from "./SaveManager";
export type { StorageAdapter, SaveSlot, SaveManagerOptions } from "./SaveManager";
export { useSaveSlots } from "./useSaveSlots";

// Error boundary
export { KataErrorBoundary } from "./KataErrorBoundary";
export type { KataErrorBoundaryProps, ErrorBoundaryFallbackProps } from "./KataErrorBoundary";

// Re-export types and classes from @kata-framework/core
export { KataEngine } from "@kata-framework/core";
export type { KSONFrame } from "@kata-framework/core";
