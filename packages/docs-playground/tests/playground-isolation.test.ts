import "./setup-dom";
import { expect, test, describe, afterEach } from "bun:test";
import { mount, type PlaygroundHandle } from "../index";

const A = `---
id: a
---

:: A :: alpha
`;

const B = `---
id: b
---

:: B :: bravo
`;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("playground — isolation between instances", () => {
  const handles: PlaygroundHandle[] = [];
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const h of handles) h.unmount();
    handles.length = 0;
    for (const c of containers) c.remove();
    containers.length = 0;
  });

  function makeContainer(): HTMLElement {
    const el = document.createElement("div");
    document.body.appendChild(el);
    containers.push(el);
    return el;
  }

  test("two mounts on two elements render distinct scenes", async () => {
    const c1 = makeContainer();
    const c2 = makeContainer();

    handles.push(mount(c1, { scene: A }));
    handles.push(mount(c2, { scene: B }));

    await wait(100);

    expect(c1.textContent).toContain("alpha");
    expect(c1.textContent).not.toContain("bravo");
    expect(c2.textContent).toContain("bravo");
    expect(c2.textContent).not.toContain("alpha");
  });

  test("editing one instance does not affect the other", async () => {
    const c1 = makeContainer();
    const c2 = makeContainer();

    const h1 = mount(c1, { scene: A });
    const h2 = mount(c2, { scene: A });
    handles.push(h1, h2);

    await wait(100);
    expect(c1.textContent).toContain("alpha");
    expect(c2.textContent).toContain("alpha");

    h1.setScene(B);
    await wait(250);

    expect(c1.textContent).toContain("bravo");
    expect(c2.textContent).toContain("alpha");
    expect(c2.textContent).not.toContain("bravo");
  });

  test("unmount tears down cleanly and allows a fresh mount in the same container", async () => {
    const c = makeContainer();

    const h1 = mount(c, { scene: A });
    await wait(100);
    expect(c.textContent).toContain("alpha");

    h1.unmount();
    // After unmount the container should be empty (React root torn down)
    // We re-mount with a new scene and expect it to work independently
    const h2 = mount(c, { scene: B });
    handles.push(h2);
    await wait(100);

    expect(c.textContent).toContain("bravo");
    expect(c.textContent).not.toContain("alpha");
  });
});
