import "./setup-dom";
import { expect, test, describe, afterEach } from "bun:test";
import React from "react";
import { KataErrorBoundary } from "../src/KataErrorBoundary";
import { renderToContainer, waitFor } from "./test-utils";

function ThrowingChild() {
  throw new Error("child error");
}

function SafeChild() {
  return <p>Safe</p>;
}

describe("KataErrorBoundary — isolation", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  test("error in one boundary does not affect siblings", async () => {
    const originalError = console.error;
    console.error = () => {};

    const { container, unmount } = renderToContainer(
      <div>
        <KataErrorBoundary fallback={({ error }) => <p>Error: {error.message}</p>}>
          <ThrowingChild />
        </KataErrorBoundary>
        <KataErrorBoundary fallback={({ error }) => <p>Error 2: {error.message}</p>}>
          <SafeChild />
        </KataErrorBoundary>
      </div>
    );
    cleanup = unmount;

    await waitFor(20);
    const paragraphs = Array.from(container.getElementsByTagName("p")).map(
      (p) => (p as HTMLElement).textContent
    );

    expect(paragraphs).toContain("Error: child error");
    expect(paragraphs).toContain("Safe");

    console.error = originalError;
  });

  test("nested boundaries catch at nearest level", async () => {
    const originalError = console.error;
    console.error = () => {};

    const { container, unmount } = renderToContainer(
      <KataErrorBoundary fallback={({ error }) => <p>Outer: {error.message}</p>}>
        <div>
          <KataErrorBoundary fallback={({ error }) => <p>Inner: {error.message}</p>}>
            <ThrowingChild />
          </KataErrorBoundary>
        </div>
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    const paragraphs = Array.from(container.getElementsByTagName("p")).map(
      (p) => (p as HTMLElement).textContent
    );

    // Inner boundary should catch, not outer
    expect(paragraphs).toContain("Inner: child error");
    expect(paragraphs).not.toContain("Outer: child error");

    console.error = originalError;
  });

  test("boundary without engine/saveManager still works for reset", async () => {
    const originalError = console.error;
    console.error = () => {};

    let resetFn: (() => void) | null = null;

    const { container, unmount } = renderToContainer(
      <KataErrorBoundary
        fallback={({ error, reset, loadLastSave }) => {
          resetFn = reset;
          const result = loadLastSave(); // should return false gracefully
          return (
            <div>
              <p>Error: {error.message}</p>
              <p>Load result: {String(result)}</p>
            </div>
          );
        }}
      >
        <ThrowingChild />
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    const paragraphs = Array.from(container.getElementsByTagName("p")).map(
      (p) => (p as HTMLElement).textContent
    );
    expect(paragraphs).toContain("Error: child error");
    expect(paragraphs).toContain("Load result: false");

    console.error = originalError;
  });
});
