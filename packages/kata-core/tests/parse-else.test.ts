import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse :::if/elseif/else", () => {
  test(":::if ... :::else ... ::: produces correct condition + fallback actions", () => {
    const scene = parseKata(`---
id: test
---
:::if{cond="gold > 50"}
:: Merchant :: Welcome, rich traveler!
:::else
:: Merchant :: Come back when you have coin.
:::
`);
    expect(scene.actions).toHaveLength(1);
    const cond = scene.actions[0] as any;
    expect(cond.type).toBe("condition");
    expect(cond.condition).toBe("gold > 50");
    expect(cond.then).toHaveLength(1);
    expect(cond.then[0].type).toBe("text");
    expect(cond.then[0].speaker).toBe("Merchant");
    expect(cond.then[0].content).toBe("Welcome, rich traveler!");
    expect(cond.else).toHaveLength(1);
    expect(cond.else[0].type).toBe("text");
    expect(cond.else[0].speaker).toBe("Merchant");
    expect(cond.else[0].content).toBe("Come back when you have coin.");
  });

  test(":::if ... :::elseif ... :::else ... ::: chains correctly", () => {
    const scene = parseKata(`---
id: test
---
:::if{cond="suspicion > 50"}
:: Guard :: Who goes there?!
:::elseif{cond="suspicion > 20"}
:: Guard :: Hmm, did I hear something?
:::else
:: Narrator :: The guard doesn't notice you.
:::
`);
    expect(scene.actions).toHaveLength(1);
    const cond = scene.actions[0] as any;
    expect(cond.type).toBe("condition");
    expect(cond.condition).toBe("suspicion > 50");
    expect(cond.then).toHaveLength(1);
    expect(cond.then[0].content).toBe("Who goes there?!");
    expect(cond.elseIf).toHaveLength(1);
    expect(cond.elseIf[0].condition).toBe("suspicion > 20");
    expect(cond.elseIf[0].then).toHaveLength(1);
    expect(cond.elseIf[0].then[0].content).toBe("Hmm, did I hear something?");
    expect(cond.else).toHaveLength(1);
    expect(cond.else[0].content).toBe("The guard doesn't notice you.");
  });

  test("Multiple :::elseif branches work", () => {
    const scene = parseKata(`---
id: test
---
:::if{cond="level > 10"}
:: NPC :: You are powerful!
:::elseif{cond="level > 5"}
:: NPC :: Getting stronger.
:::elseif{cond="level > 1"}
:: NPC :: Still a beginner.
:::else
:: NPC :: Brand new adventurer.
:::
`);
    const cond = scene.actions[0] as any;
    expect(cond.type).toBe("condition");
    expect(cond.elseIf).toHaveLength(2);
    expect(cond.elseIf[0].condition).toBe("level > 5");
    expect(cond.elseIf[1].condition).toBe("level > 1");
    expect(cond.else).toHaveLength(1);
    expect(cond.else[0].content).toBe("Brand new adventurer.");
  });

  test(":::else without preceding :::if produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
:::else
:: Narrator :: Orphaned else.
:::
`);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes("else") && d.message.includes("if"))).toBe(true);
  });
});
