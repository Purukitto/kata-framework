import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { KataEngine } from "../src/runtime/index";
import type { KSONFrame } from "../src/types";

describe("Logic System", () => {
  test("Interpolates variables in text content", () => {
    const raw = "---\nid: test-interpolation\n---\n:: Narrator ::\nHello, ${player.name}! Welcome to the adventure.\n";

    const scene = parseKata(raw);
    const engine = new KataEngine({ player: { name: "Alice" } });
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (frame: KSONFrame) => {
      frames.push(frame);
    });

    engine.start("test-interpolation");

    expect(frames).toHaveLength(1);
    const frame0 = frames[0];
    expect(frame0).toBeDefined();
    expect(frame0!.action.type).toBe("text");
    if (frame0!.action.type === "text") {
      expect(frame0!.action.content).toBe("Hello, Alice! Welcome to the adventure.");
      expect(frame0!.action.speaker).toBe("Narrator");
    }
  });

  test("Shows content when condition is true", () => {
    const raw = `---
id: test-condition-true
---
:::if{cond="true"}
:: Narrator ::
This content should be shown.
:::
:: Narrator ::
This is after the conditional.
`;

    const scene = parseKata(raw);
    const engine = new KataEngine({});
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (frame: KSONFrame) => {
      frames.push(frame);
    });

    engine.start("test-condition-true");

    // First frame should be the conditional (which will be processed)
    expect(frames).toHaveLength(1);
    const frame0 = frames[0];
    expect(frame0).toBeDefined();
    expect(frame0!.action.type).toBe("condition");

    // Process the conditional
    engine.next();

    // Should now have the content from the conditional's then block
    expect(frames).toHaveLength(2);
    const frame1 = frames[1];
    expect(frame1).toBeDefined();
    expect(frame1!.action.type).toBe("text");
    if (frame1!.action.type === "text") {
      expect(frame1!.action.content).toBe("This content should be shown.");
    }

    // Move to next action
    engine.next();

    // Should have the content after the conditional
    expect(frames).toHaveLength(3);
    const frame2 = frames[2];
    expect(frame2).toBeDefined();
    expect(frame2!.action.type).toBe("text");
    if (frame2!.action.type === "text") {
      expect(frame2!.action.content).toBe("This is after the conditional.");
    }
  });

  test("Skips content when condition is false", () => {
    const raw = `---
id: test-condition-false
---
:::if{cond="false"}
:: Narrator ::
This content should NOT be shown.
:::
:: Narrator ::
This is after the conditional.
`;

    const scene = parseKata(raw);
    const engine = new KataEngine({});
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (frame: KSONFrame) => {
      frames.push(frame);
    });

    engine.start("test-condition-false");

    // First frame should be the conditional
    expect(frames).toHaveLength(1);
    const frame0 = frames[0];
    expect(frame0).toBeDefined();
    expect(frame0!.action.type).toBe("condition");

    // Process the conditional (should skip the then block)
    engine.next();

    // Should skip directly to the content after the conditional
    expect(frames).toHaveLength(2);
    const frame1 = frames[1];
    expect(frame1).toBeDefined();
    expect(frame1!.action.type).toBe("text");
    if (frame1!.action.type === "text") {
      expect(frame1!.action.content).toBe("This is after the conditional.");
      // Verify the skipped content is NOT present
      expect(frame1!.action.content).not.toContain("should NOT be shown");
    }
  });
});
