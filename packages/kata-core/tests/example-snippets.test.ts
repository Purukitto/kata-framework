import { test, expect, describe } from "bun:test";
import { parseKata } from "../src/parser";

// These mirror the .kata files served by the docs-playground in
// docs/site/examples. If the parser regresses on any of them, the
// playground will render unreadable output, so we lock the shapes here.

describe("docs playground examples", () => {
  test("hello — adjacent speaker lines split into separate text actions", () => {
    const scene = parseKata(`---
id: hello
title: Hello
---

:: Narrator :: Welcome to Kata.
:: Narrator :: Edit the source on the left and watch this update live.
`);
    expect(scene.actions).toHaveLength(2);
    expect(scene.actions[0]).toEqual({
      type: "text",
      speaker: "Narrator",
      content: "Welcome to Kata.",
    });
    expect(scene.actions[1]).toEqual({
      type: "text",
      speaker: "Narrator",
      content: "Edit the source on the left and watch this update live.",
    });
  });

  test("choices — narrator line + choice list with optional target", () => {
    const scene = parseKata(`---
id: choices
title: Choices
---

:: Narrator :: A fork in the path. Which way?

* [Go left] -> @choices
* [Go right] -> @choices
* [Stop here]
`);
    expect(scene.actions).toHaveLength(2);
    expect(scene.actions[0]?.type).toBe("text");
    const choiceAction = scene.actions[1] as any;
    expect(choiceAction.type).toBe("choice");
    expect(choiceAction.choices).toHaveLength(3);
    expect(choiceAction.choices[0]).toMatchObject({ label: "Go left", target: "choices" });
    expect(choiceAction.choices[2]).toMatchObject({ label: "Stop here" });
  });

  test("variables — script + interpolation + conditional branches", () => {
    const scene = parseKata(`---
id: variables
title: Variables
---

<script>
ctx.player = { name: "Ada", gold: 80 };
</script>

:: Narrator :: Hello, \${player.name}. You have \${player.gold} gold.

:::if{cond="player.gold >= 50"}
:: Merchant :: A wealthy traveler! Browse my wares?
:::else
:: Merchant :: Come back when your purse is heavier.
:::
`);
    expect(scene.script).toContain("ctx.player");
    expect(scene.actions[0]).toMatchObject({ type: "text", speaker: "Narrator" });
    const cond = scene.actions[1] as any;
    expect(cond.type).toBe("condition");
    expect(cond.condition).toBe("player.gold >= 50");
    expect(cond.then[0]).toMatchObject({ type: "text", speaker: "Merchant" });
    expect(cond.else[0]).toMatchObject({ type: "text", speaker: "Merchant" });
  });

  test("save — script + text + exec + text", () => {
    const scene = parseKata(`---
id: save
title: Save
---

<script>
ctx.chapter = 1;
ctx.hasKey = false;
</script>

:: Narrator :: Chapter \${chapter}.

[exec]
ctx.hasKey = true;
[/exec]

:: Narrator :: You found a key. (Saving this moment is one snapshot away.)
`);
    expect(scene.script).toContain("ctx.chapter");
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[0]?.type).toBe("text");
    expect(scene.actions[1]?.type).toBe("exec");
    expect(scene.actions[2]?.type).toBe("text");
  });

  test("tween — text + tween action + text", () => {
    const scene = parseKata(`---
id: tween
title: Tween
---

:: Narrator :: The stranger approaches.

[tween target="stranger" property="x" from="100" to="400" duration="800" easing="ease-in-out"]

:: Stranger :: We need to talk.
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[0]).toMatchObject({ type: "text", speaker: "Narrator" });
    expect(scene.actions[1]).toMatchObject({
      type: "tween",
      target: "stranger",
      property: "x",
      to: 400,
      duration: 800,
    });
    expect(scene.actions[2]).toMatchObject({ type: "text", speaker: "Stranger" });
  });

  test("multi-speaker paragraph — three adjacent lines with continuation", () => {
    const scene = parseKata(`---
id: multi
title: Multi
---

:: Alice :: Hi.
:: Bob :: Hello there.
General Kenobi.
:: Alice :: Bye.
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[0]).toEqual({ type: "text", speaker: "Alice", content: "Hi." });
    expect(scene.actions[1]).toEqual({
      type: "text",
      speaker: "Bob",
      content: "Hello there.\nGeneral Kenobi.",
    });
    expect(scene.actions[2]).toEqual({ type: "text", speaker: "Alice", content: "Bye." });
  });
});
