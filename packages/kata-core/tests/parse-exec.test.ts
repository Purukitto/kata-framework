import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse [exec] directive", () => {
  test("[exec] ctx.x = 1 [/exec] parses to { type: 'exec', code: 'ctx.x = 1' }", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

[exec]
ctx.x = 1
[/exec]

:: Narrator :: Done
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[1]).toEqual({ type: "exec", code: "ctx.x = 1" });
  });

  test("Multiline code blocks preserve content", () => {
    const scene = parseKata(`---
id: test
---
[exec]
ctx.x = 1;
ctx.y = ctx.x + 10;
ctx.name = "hero";
[/exec]
`);
    expect(scene.actions[0]).toEqual({
      type: "exec",
      code: 'ctx.x = 1;\nctx.y = ctx.x + 10;\nctx.name = "hero";',
    });
  });

  test("Unclosed [exec] produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[exec]
ctx.x = 1
`);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes("exec") && d.message.toLowerCase().includes("unclosed"))).toBe(true);
  });
});
