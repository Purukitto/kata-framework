import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse [tween] directive", () => {
  test("single tween parses to correct KSON action", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

[tween target="stranger" property="x" from="100" to="400" duration="800" easing="ease-in-out"]

:: Narrator :: Done
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[1]).toEqual({
      type: "tween",
      target: "stranger",
      property: "x",
      from: 100,
      to: 400,
      duration: 800,
      easing: "ease-in-out",
    });
  });

  test("tween without from field omits from", () => {
    const scene = parseKata(`---
id: test
---
[tween target="bg" property="opacity" to="1" duration="500"]
`);
    expect(scene.actions[0]).toEqual({
      type: "tween",
      target: "bg",
      property: "opacity",
      to: 1,
      duration: 500,
    });
  });

  test("tween without easing omits easing", () => {
    const scene = parseKata(`---
id: test
---
[tween target="char" property="y" from="0" to="200" duration="1000"]
`);
    const action = scene.actions[0] as any;
    expect(action.type).toBe("tween");
    expect(action.easing).toBeUndefined();
  });

  test("missing target produces diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[tween target="" property="x" to="100" duration="500"]
`);
    expect(diagnostics.some((d) => d.message.includes("tween") && d.message.includes("target"))).toBe(true);
  });

  test("missing duration produces diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[tween target="obj" property="x" to="100"]
`);
    expect(diagnostics.some((d) => d.message.includes("tween") && d.message.includes("duration"))).toBe(true);
  });

  test("missing to value produces diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[tween target="obj" property="x" duration="500"]
`);
    expect(diagnostics.some((d) => d.message.includes("tween") && d.message.includes("to"))).toBe(true);
  });

  test("multiple tweens in sequence parse correctly", () => {
    const scene = parseKata(`---
id: test
---
[tween target="a" property="x" to="100" duration="500"]

[tween target="b" property="y" to="200" duration="300"]
`);
    expect(scene.actions).toHaveLength(2);
    expect(scene.actions[0]!.type).toBe("tween");
    expect(scene.actions[1]!.type).toBe("tween");
  });
});
