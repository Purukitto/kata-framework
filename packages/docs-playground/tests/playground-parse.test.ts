import "./setup-dom";
import { expect, test, describe, afterEach } from "bun:test";
import { mount, type PlaygroundHandle } from "../index";

const VALID_HELLO = `---
id: hello
---

:: Narrator :: Hello world
`;

const VALID_GOODBYE = `---
id: hello
---

:: Narrator :: Goodbye moon
`;

const BROKEN = `---
id: hello
---

:::if{cond="("}
:: Narrator :: unreachable
:::
`;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("playground — parse + render lifecycle", () => {
  let handle: PlaygroundHandle | null = null;
  let container: HTMLElement | null = null;

  afterEach(() => {
    handle?.unmount();
    handle = null;
    container?.remove();
    container = null;
  });

  test("mount with valid scene renders first frame text", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    handle = mount(container, { scene: VALID_HELLO });

    // React + engine start is synchronous enough to settle within a microtask flush
    await wait(50);

    expect(container.textContent).toContain("Hello world");
  });

  test("setScene with edited valid source re-parses and updates output", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    handle = mount(container, { scene: VALID_HELLO });
    await wait(50);
    expect(container.textContent).toContain("Hello world");

    handle.setScene(VALID_GOODBYE);
    // debounce is 150ms; give it time
    await wait(250);

    expect(container.textContent).toContain("Goodbye moon");
    expect(container.textContent).not.toContain("Hello world");
  });

  test("broken source surfaces diagnostics, previous valid frame stays", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    handle = mount(container, { scene: VALID_HELLO });
    await wait(50);
    expect(container.textContent).toContain("Hello world");

    handle.setScene(BROKEN);
    await wait(250);

    // Error strip should surface — look for a data marker we'll add to the error UI
    const errorStrip = container.querySelector("[data-playground-error]");
    expect(errorStrip).not.toBeNull();
    // Previous valid frame should still be visible
    expect(container.textContent).toContain("Hello world");
  });

  test("Next button advances past a text frame", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const TWO_LINES = `---
id: hello
---

:: Narrator :: First.
:: Narrator :: Second.
`;
    handle = mount(container, { scene: TWO_LINES });
    await wait(50);

    const output = () =>
      container!.querySelector("[data-playground-output]")?.textContent ?? "";

    expect(output()).toContain("First.");
    expect(output()).not.toContain("Second.");

    const nextBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Next"),
    ) as HTMLButtonElement | undefined;
    expect(nextBtn).toBeDefined();
    nextBtn!.click();
    await wait(20);

    expect(output()).toContain("Second.");
    expect(output()).not.toContain("First.");
  });

  test("Choice buttons render and route via makeChoice", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const WITH_CHOICE = `---
id: hello
---

:: Narrator :: Pick one.

* [Alpha]
* [Beta]
`;
    handle = mount(container, { scene: WITH_CHOICE });
    await wait(50);

    // Need to advance past the text frame to reach the choice frame
    const nextBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Next"),
    ) as HTMLButtonElement | undefined;
    nextBtn!.click();
    await wait(20);

    const choiceContainer = container.querySelector("[data-playground-choices]");
    expect(choiceContainer).not.toBeNull();
    const choiceBtns = choiceContainer!.querySelectorAll("button");
    expect(choiceBtns.length).toBe(2);
    expect(choiceBtns[0]?.textContent).toContain("Alpha");
    expect(choiceBtns[1]?.textContent).toContain("Beta");
  });

  test("reset restores original scene", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    handle = mount(container, { scene: VALID_HELLO });
    await wait(50);

    handle.setScene(VALID_GOODBYE);
    await wait(250);
    expect(container.textContent).toContain("Goodbye moon");

    handle.reset();
    await wait(250);
    expect(container.textContent).toContain("Hello world");
  });
});
