import { expect, test, describe } from "bun:test";
import { createTestEngine } from "../src/createTestEngine";

const SCENE_A = `---
id: sceneA
---

:: Narrator :: Hello from A
`;

const SCENE_B = `---
id: sceneB
---

:: Narrator :: Hello from B
`;

describe("createTestEngine", () => {
  test("accepts a single string", () => {
    const { engine, frames } = createTestEngine(SCENE_A);
    engine.start("sceneA");
    expect(frames).toHaveLength(1);
    expect(frames[0]!.action.type).toBe("text");
  });

  test("accepts an array of strings", () => {
    const { engine, frames } = createTestEngine([SCENE_A, SCENE_B]);
    engine.start("sceneA");
    expect(frames).toHaveLength(1);
    engine.start("sceneB");
    expect(frames).toHaveLength(2);
  });

  test("passes initial context", () => {
    const { engine, frames } = createTestEngine(
      `---
id: ctx
---

:: Narrator :: Hello \${name}
`,
      { name: "World" }
    );
    engine.start("ctx");
    expect(frames[0]!.action.type).toBe("text");
    if (frames[0]!.action.type === "text") {
      expect(frames[0]!.action.content).toBe("Hello World");
    }
  });

  test("live frames array updates on advance", () => {
    const { engine, frames } = createTestEngine(`---
id: multi
---

:: A :: first

:: A :: second
`);
    engine.start("multi");
    expect(frames).toHaveLength(1);
    engine.next();
    expect(frames).toHaveLength(2);
  });
});
