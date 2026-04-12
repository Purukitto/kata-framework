import "./setup-dom";
import { expect, test, describe, afterEach } from "bun:test";
import React, { useState } from "react";
import { KataErrorBoundary } from "../src/KataErrorBoundary";
import { SaveManager } from "../src/SaveManager";
import { KataEngine, parseKata } from "@kata-framework/core";
import { renderToContainer, waitFor, createMockStorage } from "./test-utils";
import type { GameStateSnapshot } from "@kata-framework/core";

function makeSnapshot(overrides: Partial<GameStateSnapshot> = {}): GameStateSnapshot {
  return {
    schemaVersion: 3,
    ctx: { gold: 100 },
    currentSceneId: "intro",
    currentActionIndex: 0,
    history: ["intro"],
    ...overrides,
  };
}

function ThrowOnce({ fail }: { fail: boolean }) {
  if (fail) throw new Error("render crash");
  return <p>Recovered</p>;
}

describe("KataErrorBoundary — recovery", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  test("reset() clears error and re-renders children", async () => {
    const originalError = console.error;
    console.error = () => {};

    let resetFn: (() => void) | null = null;

    function TestApp() {
      const [fail, setFail] = useState(true);
      return (
        <KataErrorBoundary
          fallback={({ error, reset }) => {
            resetFn = () => {
              setFail(false);
              reset();
            };
            return <p>Error: {error.message}</p>;
          }}
        >
          <ThrowOnce fail={fail} />
        </KataErrorBoundary>
      );
    }

    const { container, unmount } = renderToContainer(<TestApp />);
    cleanup = unmount;

    await waitFor(20);
    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Error: render crash");

    // Call reset (with state change to stop throwing)
    resetFn?.();
    await waitFor(20);

    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Recovered");

    console.error = originalError;
  });

  test("restart() calls engine.start() and clears error", async () => {
    const originalError = console.error;
    console.error = () => {};

    const raw = `---
id: intro
---
:: Narrator ::
Hello world.`;
    const scene = parseKata(raw);
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("intro");

    let startCalled = false;
    const originalStart = engine.start.bind(engine);
    engine.start = (id: string) => {
      startCalled = true;
      return originalStart(id);
    };

    let restartFn: ((id?: string) => void) | null = null;

    function TestApp() {
      const [fail, setFail] = useState(true);
      return (
        <KataErrorBoundary
          engine={engine}
          fallback={({ restart }) => {
            restartFn = (id?: string) => {
              setFail(false);
              restart(id);
            };
            return <p>Crashed</p>;
          }}
        >
          <ThrowOnce fail={fail} />
        </KataErrorBoundary>
      );
    }

    const { container, unmount } = renderToContainer(<TestApp />);
    cleanup = unmount;

    await waitFor(20);
    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Crashed");

    restartFn?.("intro");
    await waitFor(20);

    expect(startCalled).toBe(true);
    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Recovered");

    console.error = originalError;
  });

  test("loadLastSave() loads most recent save and clears error", async () => {
    const originalError = console.error;
    console.error = () => {};

    const raw = `---
id: intro
---
:: Narrator ::
Hello world.`;
    const scene = parseKata(raw);
    const engine = new KataEngine({ gold: 50 });
    engine.registerScene(scene);
    engine.start("intro");

    const storage = createMockStorage();
    const saveManager = new SaveManager({ storage, prefix: "test", maxSlots: 3 });

    // Save a snapshot
    const snapshot = makeSnapshot({ ctx: { gold: 999 } });
    saveManager.save(0, snapshot);

    let loadResult = false;
    let loadFn: (() => void) | null = null;

    function TestApp() {
      const [fail, setFail] = useState(true);
      return (
        <KataErrorBoundary
          engine={engine}
          saveManager={saveManager}
          fallback={({ loadLastSave }) => {
            loadFn = () => {
              loadResult = loadLastSave();
              setFail(false);
            };
            return <p>Crashed</p>;
          }}
        >
          <ThrowOnce fail={fail} />
        </KataErrorBoundary>
      );
    }

    const { container, unmount } = renderToContainer(<TestApp />);
    cleanup = unmount;

    await waitFor(20);
    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Crashed");

    loadFn?.();
    await waitFor(20);

    expect(loadResult).toBe(true);
    expect(container.getElementsByTagName("p")[0]?.textContent).toBe("Recovered");

    console.error = originalError;
  });

  test("loadLastSave() returns false when no saves exist", async () => {
    const originalError = console.error;
    console.error = () => {};

    const raw = `---
id: intro
---
:: Narrator ::
Hello.`;
    const scene = parseKata(raw);
    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("intro");

    const storage = createMockStorage();
    const saveManager = new SaveManager({ storage, prefix: "test", maxSlots: 3 });

    let loadResult = true;

    const { container, unmount } = renderToContainer(
      <KataErrorBoundary
        engine={engine}
        saveManager={saveManager}
        fallback={({ loadLastSave }) => {
          loadResult = loadLastSave();
          return <p>No saves</p>;
        }}
      >
        <ThrowOnce fail={true} />
      </KataErrorBoundary>
    );
    cleanup = unmount;

    await waitFor(20);
    expect(loadResult).toBe(false);

    console.error = originalError;
  });
});
