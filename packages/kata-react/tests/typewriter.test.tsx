import "./setup-dom";
import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React from "react";
import { TypewriterText } from "../src/TypewriterText";
import { renderToContainer, mockMatchMedia, waitFor } from "./test-utils";

/** Get the outermost span (the TypewriterText wrapper) */
function getWrapper(container: HTMLElement): HTMLElement {
  return container.getElementsByTagName("span")[0] as HTMLElement;
}

describe("TypewriterText", () => {
  let cleanup: (() => void) | null = null;
  let restoreMedia: (() => void) | null = null;

  beforeEach(() => {
    restoreMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    restoreMedia?.();
    restoreMedia = null;
  });

  test("renders full text instantly when skip=true", async () => {
    let completed = false;
    const { container, unmount } = renderToContainer(
      <TypewriterText text="Hello world" skip={true} onComplete={() => { completed = true; }} />
    );
    cleanup = unmount;

    await waitFor(50);
    const wrapper = getWrapper(container);
    expect(wrapper.textContent).toBe("Hello world");
    expect(completed).toBe(true);
  });

  test("renders full text instantly when prefers-reduced-motion", async () => {
    restoreMedia?.();
    restoreMedia = mockMatchMedia(true);

    let completed = false;
    const { container, unmount } = renderToContainer(
      <TypewriterText text="Reduced motion text" onComplete={() => { completed = true; }} />
    );
    cleanup = unmount;

    await waitFor(50);
    const wrapper = getWrapper(container);
    expect(wrapper.textContent).toBe("Reduced motion text");
    expect(completed).toBe(true);
  });

  test("text appears progressively (not all at once)", async () => {
    const { container, unmount } = renderToContainer(
      <TypewriterText text="ABCDEF" speed={50} />
    );
    cleanup = unmount;

    // After a short time, not all text should be visible
    await waitFor(80);
    const spans = container.getElementsByTagName("span");
    // spans[0] = wrapper, spans[1] = visible text, spans[2] = hidden text (if any)
    const visibleText = (spans[1] as HTMLElement)?.textContent ?? "";
    expect(visibleText.length).toBeGreaterThan(0);
    expect(visibleText.length).toBeLessThanOrEqual(6);
  });

  test("onComplete fires when all text is revealed", async () => {
    let completed = false;
    const { unmount } = renderToContainer(
      <TypewriterText text="Hi" speed={10} onComplete={() => { completed = true; }} />
    );
    cleanup = unmount;

    await waitFor(150);
    expect(completed).toBe(true);
  });

  test("clicking the component reveals all text instantly", async () => {
    let completeCount = 0;
    const { container, unmount } = renderToContainer(
      <TypewriterText text="Click me to reveal" speed={1000} onComplete={() => { completeCount++; }} />
    );
    cleanup = unmount;

    await waitFor(20);

    const wrapper = getWrapper(container);
    wrapper.click();

    await waitFor(50);
    expect(wrapper.textContent).toBe("Click me to reveal");
    expect(completeCount).toBe(1);

    // Click again — should not fire onComplete again
    wrapper.click();
    await waitFor(50);
    expect(completeCount).toBe(1);
  });

  test("aria-label contains full text during animation", async () => {
    const { container, unmount } = renderToContainer(
      <TypewriterText text="Full accessibility text" speed={1000} />
    );
    cleanup = unmount;

    await waitFor(20);
    const wrapper = getWrapper(container);
    expect(wrapper.getAttribute("aria-label")).toBe("Full accessibility text");
  });

  test("aria-live is off during animation and polite after completion", async () => {
    const { container, unmount } = renderToContainer(
      <TypewriterText text="ABCDEFGHIJKLMNOP" speed={100} />
    );
    cleanup = unmount;

    await waitFor(30);
    const wrapper = getWrapper(container);
    // 16 chars * 100ms = 1600ms total, so 30ms in should still be animating
    expect(wrapper.getAttribute("aria-live")).toBe("off");

    // Skip to complete
    wrapper.click();
    await waitFor(50);
    expect(wrapper.getAttribute("aria-live")).toBe("polite");
  });

  test("empty string completes immediately", async () => {
    let completed = false;
    const { unmount } = renderToContainer(
      <TypewriterText text="" onComplete={() => { completed = true; }} />
    );
    cleanup = unmount;

    await waitFor(50);
    expect(completed).toBe(true);
  });

  test("changing text prop resets animation", async () => {
    let completeCount = 0;

    const { container, root, unmount } = renderToContainer(
      <TypewriterText text="First" skip={true} onComplete={() => { completeCount++; }} />
    );
    cleanup = unmount;

    await waitFor(50);
    expect(completeCount).toBe(1);

    root.render(
      <TypewriterText text="Second" skip={true} onComplete={() => { completeCount++; }} />
    );

    await waitFor(50);
    expect(completeCount).toBe(2);
    const wrapper = getWrapper(container);
    expect(wrapper.textContent).toBe("Second");
  });
});
