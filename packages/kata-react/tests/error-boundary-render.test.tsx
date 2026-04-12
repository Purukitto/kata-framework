import "./setup-dom";
import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React from "react";
import { KataErrorBoundary } from "../src/KataErrorBoundary";
import { renderToContainer, waitFor } from "./test-utils";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <p>OK</p>;
}

describe("KataErrorBoundary — rendering", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  test("renders children when no error", async () => {
    const { container, unmount } = renderToContainer(
      <KataErrorBoundary fallback={({ error }) => <p>Error: {error.message}</p>}>
        <p>Hello</p>
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    const p = container.getElementsByTagName("p")[0] as HTMLElement;
    expect(p.textContent).toBe("Hello");
  });

  test("shows fallback when child throws", async () => {
    // Suppress React error boundary console output
    const originalError = console.error;
    console.error = () => {};

    const { container, unmount } = renderToContainer(
      <KataErrorBoundary fallback={({ error }) => <p>Error: {error.message}</p>}>
        <ThrowingChild shouldThrow={true} />
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    const p = container.getElementsByTagName("p")[0] as HTMLElement;
    expect(p.textContent).toBe("Error: boom");

    console.error = originalError;
  });

  test("fallback receives correct error object", async () => {
    const originalError = console.error;
    console.error = () => {};

    let capturedError: Error | null = null;
    const { container, unmount } = renderToContainer(
      <KataErrorBoundary
        fallback={({ error }) => {
          capturedError = error;
          return <p>Caught</p>;
        }}
      >
        <ThrowingChild shouldThrow={true} />
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    expect(capturedError).not.toBeNull();
    expect(capturedError!.message).toBe("boom");

    console.error = originalError;
  });

  test("onError callback fires with error and errorInfo", async () => {
    const originalError = console.error;
    console.error = () => {};

    let receivedError: Error | null = null;
    let receivedInfo: any = null;

    const { container, unmount } = renderToContainer(
      <KataErrorBoundary
        fallback={({ error }) => <p>Error: {error.message}</p>}
        onError={(error, info) => {
          receivedError = error;
          receivedInfo = info;
        }}
      >
        <ThrowingChild shouldThrow={true} />
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    expect(receivedError).not.toBeNull();
    expect(receivedError!.message).toBe("boom");
    expect(receivedInfo).not.toBeNull();

    console.error = originalError;
  });
});
