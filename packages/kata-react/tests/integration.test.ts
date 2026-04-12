import { expect, test, describe } from "bun:test";
import { parseKata, KataEngine } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";

const INTEGRATION_SCENE = `---
id: integration_test
---
:::if{cond="player.gold > 10"}
:: Narrator ::
You have \${player.gold} gold.
:::
* [Buy Item] -> @buy
`;

describe("Kata Ecosystem Integration", () => {
  test("full flow: parse scene, run engine, verify logic, interpolation, and choice", () => {
    // --- Parse ---
    const scene = parseKata(INTEGRATION_SCENE);

    // Check 1 (Parser): Scene ID correctly parsed
    expect(scene.meta.id).toBe("integration_test");

    // --- Initialize engine and register scenes ---
    const engine = new KataEngine({ player: { gold: 50 } });
    engine.registerScene(scene);

    // Minimal "buy" scene so makeChoice -> @buy can start it
    const buyScene = parseKata(`---
id: buy
---
:: Shop ::
You bought the item.
`);
    engine.registerScene(buyScene);

    // --- Simulate React hook: subscribe then start ---
    const frames: KSONFrame[] = [];
    engine.on("update", (frame: KSONFrame) => {
      frames.push(frame);
    });

    engine.start("integration_test");

    // Check 2 (Logic): Condition is auto-advanced — first frame is the then-block text
    expect(frames.length).toBeGreaterThanOrEqual(1);
    const textFrame = frames[0];
    expect(textFrame).toBeDefined();
    expect(textFrame!.action.type).toBe("text");

    // Check 3 (Interpolation): Content must say "You have 50 gold", not "${player.gold}"
    if (textFrame!.action.type === "text") {
      expect(textFrame!.action.content).toBe("You have 50 gold.");
      expect(textFrame!.action.content).not.toContain("${player.gold}");
    }

    // Advance to the choice
    engine.next();
    expect(frames.length).toBeGreaterThanOrEqual(2);
    const choiceFrame = frames[1];
    expect(choiceFrame).toBeDefined();
    expect(choiceFrame!.action.type).toBe("choice");

    if (!choiceFrame || choiceFrame.action.type !== "choice") throw new Error("expected choice");
    const choiceId = choiceFrame.action.choices[0]?.id;
    expect(choiceId).toBeDefined();

    // Check 4 (Flow): makeChoice updates state (navigates to @buy)
    engine.makeChoice(choiceId!);

    // After makeChoice we should have a new frame from the "buy" scene
    expect(frames.length).toBeGreaterThanOrEqual(3);
    const afterChoice = frames[2];
    expect(afterChoice).toBeDefined();
    expect(afterChoice!.meta.id).toBe("buy");
    expect(afterChoice!.state.currentSceneId).toBe("buy");
    if (afterChoice!.action.type === "text") {
      expect(afterChoice!.action.content).toBe("You bought the item.");
    }
  });
});
