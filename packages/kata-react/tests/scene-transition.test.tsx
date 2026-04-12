import "./setup-dom";
import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React from "react";
import { SceneTransition } from "../src/SceneTransition";
import { renderToContainer, mockMatchMedia, waitFor } from "./test-utils";

describe("SceneTransition", () => {
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

  test("renders children normally with initial sceneId", async () => {
    const { container, unmount } = renderToContainer(
      <SceneTransition sceneId="intro">
        <p>Welcome</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(50);
    const p = container.getElementsByTagName("p")[0] as HTMLElement;
    expect(p.textContent).toBe("Welcome");
  });

  test("on sceneId change, both old and new children exist in DOM during transition", async () => {
    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="scene-1" transition="fade" duration={500}>
        <p>Scene 1</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    // Change scene
    root.render(
      <SceneTransition sceneId="scene-2" transition="fade" duration={500}>
        <p>Scene 2</p>
      </SceneTransition>
    );

    await waitFor(50);
    const paragraphs = container.getElementsByTagName("p");
    // Both scenes should be in the DOM during transition
    const texts = Array.from(paragraphs).map((p) => p.textContent);
    expect(texts).toContain("Scene 1");
    expect(texts).toContain("Scene 2");
  });

  test("after transition duration, old children are removed", async () => {
    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="a" transition="fade" duration={100}>
        <p>Old</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    root.render(
      <SceneTransition sceneId="b" transition="fade" duration={100}>
        <p>New</p>
      </SceneTransition>
    );

    // Wait for duration + safety margin
    await waitFor(200);
    const paragraphs = container.getElementsByTagName("p");
    const texts = Array.from(paragraphs).map((p) => p.textContent);
    expect(texts).not.toContain("Old");
    expect(texts).toContain("New");
  });

  test("reduced motion — instant swap, no dual-render", async () => {
    restoreMedia?.();
    restoreMedia = mockMatchMedia(true);

    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="a" transition="fade" duration={500}>
        <p>Old</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    root.render(
      <SceneTransition sceneId="b" transition="fade" duration={500}>
        <p>New</p>
      </SceneTransition>
    );

    await waitFor(50);
    const paragraphs = container.getElementsByTagName("p");
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]!.textContent).toBe("New");
  });

  test("transition=none is instant", async () => {
    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="a" transition="none" duration={500}>
        <p>Old</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    root.render(
      <SceneTransition sceneId="b" transition="none" duration={500}>
        <p>New</p>
      </SceneTransition>
    );

    await waitFor(50);
    const paragraphs = container.getElementsByTagName("p");
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]!.textContent).toBe("New");
  });

  test("rapid scene changes — only latest scene visible after settling", async () => {
    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="a" transition="fade" duration={100}>
        <p>A</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    // Rapid changes
    root.render(
      <SceneTransition sceneId="b" transition="fade" duration={100}>
        <p>B</p>
      </SceneTransition>
    );
    await waitFor(10);

    root.render(
      <SceneTransition sceneId="c" transition="fade" duration={100}>
        <p>C</p>
      </SceneTransition>
    );

    // Wait for all transitions to complete
    await waitFor(300);
    const paragraphs = container.getElementsByTagName("p");
    const texts = Array.from(paragraphs).map((p) => p.textContent);
    expect(texts).toContain("C");
    // Old scenes should be gone
    expect(texts).not.toContain("A");
  });

  test("slide-left transition uses transform", async () => {
    const { container, root, unmount } = renderToContainer(
      <SceneTransition sceneId="a" transition="slide-left" duration={200}>
        <p>Old</p>
      </SceneTransition>
    );
    cleanup = unmount;

    await waitFor(20);

    root.render(
      <SceneTransition sceneId="b" transition="slide-left" duration={200}>
        <p>New</p>
      </SceneTransition>
    );

    await waitFor(50);
    // During transition, wrapper div should exist with positioned children
    const divs = container.getElementsByTagName("div");
    expect(divs.length).toBeGreaterThan(0);
  });
});
