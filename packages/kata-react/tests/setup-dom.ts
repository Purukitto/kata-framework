import { Window } from "happy-dom";

// Only set up DOM globals if not already present
if (typeof globalThis.window === "undefined") {
  const window = new Window({ url: "http://localhost" });

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLDivElement: window.HTMLDivElement,
    HTMLSpanElement: window.HTMLSpanElement,
    HTMLButtonElement: window.HTMLButtonElement,
    Element: window.Element,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    MediaQueryListEvent: window.MediaQueryListEvent,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    MutationObserver: window.MutationObserver,
    matchMedia: window.matchMedia.bind(window),
  });
}
