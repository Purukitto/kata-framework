import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse [wait] directive", () => {
  test("[wait 2000] parses to { type: 'wait', duration: 2000 }", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

[wait 2000]

:: Narrator :: After pause
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[1]).toEqual({ type: "wait", duration: 2000 });
  });

  test("[wait 500] handles different durations", () => {
    const scene = parseKata(`---
id: test
---
[wait 500]
`);
    expect(scene.actions[0]).toEqual({ type: "wait", duration: 500 });
  });

  test("[wait] without duration produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[wait]
`);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes("wait") && d.message.includes("duration"))).toBe(true);
  });
});
