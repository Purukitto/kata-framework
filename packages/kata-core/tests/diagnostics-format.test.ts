import { expect, test, describe } from "bun:test";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, Diagnostic } from "../types";

describe("Diagnostic Format", () => {
  test("parser diagnostics have level, message, and sceneId", () => {
    const raw = `---
title: No ID
---

:::if{cond="???"}
:: A :: text
:::
`;
    const { diagnostics } = parseKataWithDiagnostics(raw);
    for (const d of diagnostics) {
      expect(d.level).toBeDefined();
      expect(d.message).toBeDefined();
      expect(typeof d.message).toBe("string");
    }
    // Missing id warning has sceneId
    const idWarn = diagnostics.find((d) => d.message.includes("Missing"));
    expect(idWarn?.sceneId).toBe("unknown");
  });

  test("condition error diagnostics include line number", () => {
    const raw = `---
id: fmt
---

:::if{cond="???invalid"}
:: A :: text
:::
`;
    const { diagnostics } = parseKataWithDiagnostics(raw);
    const condError = diagnostics.find((d) => d.message.includes("Invalid condition"));
    expect(condError).toBeDefined();
    expect(condError!.line).toBeDefined();
    expect(typeof condError!.line).toBe("number");
  });

  test("runtime error diagnostics have actionIndex", () => {
    const scene: KSONScene = {
      meta: { id: "rtfmt" },
      script: "",
      actions: [
        { type: "condition", condition: "!!!bad", then: [{ type: "text", speaker: "A", content: "x" }] },
        { type: "text", speaker: "B", content: "ok" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);

    const errors: Diagnostic[] = [];
    engine.on("error", (d) => errors.push(d));
    engine.start("rtfmt");
    engine.next();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].actionIndex).toBeDefined();
    expect(typeof errors[0].actionIndex).toBe("number");
  });
});
