import { expect, test, describe } from "bun:test";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parser Diagnostics", () => {
  test("warns on missing id in frontmatter", () => {
    const raw = `---
title: No ID Scene
---

:: Narrator :: Hello
`;
    const { scene, diagnostics } = parseKataWithDiagnostics(raw);
    expect(scene.meta.id).toBe("unknown");
    const warning = diagnostics.find((d) => d.message.includes("Missing `id`"));
    expect(warning).toBeDefined();
    expect(warning!.level).toBe("warning");
  });

  test("errors on invalid condition expression", () => {
    const raw = `---
id: test
---

:::if{cond="???invalid!!!"}
:: Narrator :: Hidden
:::
`;
    const { diagnostics } = parseKataWithDiagnostics(raw);
    const error = diagnostics.find((d) => d.message.includes("Invalid condition"));
    expect(error).toBeDefined();
    expect(error!.level).toBe("error");
    expect(error!.sceneId).toBe("test");
  });

  test("no diagnostics for valid scene", () => {
    const raw = `---
id: valid
---

:: Narrator :: Hello world
`;
    const { scene, diagnostics } = parseKataWithDiagnostics(raw);
    expect(diagnostics).toHaveLength(0);
    expect(scene.meta.id).toBe("valid");
  });

  test("handles catastrophic parse failure", () => {
    // gray-matter will fail on null input
    const { diagnostics } = parseKataWithDiagnostics(null as any);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].level).toBe("error");
    expect(diagnostics[0].message).toContain("Parse failure");
  });
});
