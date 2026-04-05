import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse [tween-group] directive", () => {
  test("parallel mode groups tweens correctly", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Before

[tween-group parallel]
[tween target="stranger" property="opacity" to="1" duration="500"]
[tween target="bg" property="blur" to="5" duration="500"]
[/tween-group]

:: Narrator :: After
`);
    expect(scene.actions).toHaveLength(3);
    const group = scene.actions[1] as any;
    expect(group.type).toBe("tween-group");
    expect(group.mode).toBe("parallel");
    expect(group.tweens).toHaveLength(2);
    expect(group.tweens[0].target).toBe("stranger");
    expect(group.tweens[0].property).toBe("opacity");
    expect(group.tweens[0].to).toBe(1);
    expect(group.tweens[1].target).toBe("bg");
    expect(group.tweens[1].property).toBe("blur");
  });

  test("sequence mode sets mode to 'sequence'", () => {
    const scene = parseKata(`---
id: test
---
[tween-group sequence]
[tween target="a" property="x" to="100" duration="300"]
[tween target="a" property="y" to="200" duration="300"]
[/tween-group]
`);
    const group = scene.actions[0] as any;
    expect(group.type).toBe("tween-group");
    expect(group.mode).toBe("sequence");
    expect(group.tweens).toHaveLength(2);
  });

  test("tween-group with from and easing attributes", () => {
    const scene = parseKata(`---
id: test
---
[tween-group parallel]
[tween target="obj" property="x" from="0" to="100" duration="500" easing="ease-out"]
[/tween-group]
`);
    const group = scene.actions[0] as any;
    expect(group.tweens[0].from).toBe(0);
    expect(group.tweens[0].easing).toBe("ease-out");
  });

  test("empty tween-group produces diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[tween-group parallel]
[/tween-group]
`);
    expect(diagnostics.some((d) => d.message.includes("tween-group") && d.message.includes("no tweens"))).toBe(true);
  });

  test("unclosed tween-group produces diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[tween-group parallel]
[tween target="a" property="x" to="100" duration="500"]
`);
    expect(diagnostics.some((d) => d.message.includes("tween-group") && d.message.includes("missing"))).toBe(true);
  });

  test("multiple tween-groups in one scene", () => {
    const scene = parseKata(`---
id: test
---
[tween-group parallel]
[tween target="a" property="x" to="100" duration="500"]
[/tween-group]

[tween-group sequence]
[tween target="b" property="y" to="200" duration="300"]
[/tween-group]
`);
    expect(scene.actions).toHaveLength(2);
    expect((scene.actions[0] as any).mode).toBe("parallel");
    expect((scene.actions[1] as any).mode).toBe("sequence");
  });
});
