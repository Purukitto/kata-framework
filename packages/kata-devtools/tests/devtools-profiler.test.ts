import { expect, test, describe } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import type { KataPlugin } from "@kata-framework/core";
import { devtoolsPlugin } from "../src/devtoolsPlugin";

const SCENE = `---
id: walk
---

:: Narrator :: step one

:: Narrator :: step two

:: Narrator :: step three
`;

function busyWait(ms: number) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    /* spin */
  }
}

function slowPlugin(name: string, ms: number): KataPlugin {
  return {
    name,
    afterAction() {
      busyWait(ms);
    },
  };
}

describe("devtoolsPlugin profiler", () => {
  test("records execution time per plugin hook invocation", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);
    engine.use(slowPlugin("alpha", 5));

    engine.start("walk");
    engine.next();
    engine.next();

    const report = devtools.getProfilerReport();
    const alpha = report.hooks.find((h) => h.pluginName === "alpha" && h.hook === "afterAction");
    expect(alpha).toBeDefined();
    expect(alpha!.callCount).toBeGreaterThanOrEqual(3);
    expect(alpha!.totalMs).toBeGreaterThan(0);
    expect(alpha!.avgMs).toBeGreaterThan(0);
  });

  test("identifies the slowest plugin", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);
    engine.use(slowPlugin("fast", 0));
    engine.use(slowPlugin("slow", 8));

    engine.start("walk");
    engine.next();
    engine.next();

    const report = devtools.getProfilerReport();
    expect(report.slowestPlugin).toBe("slow");
  });

  test("reports frame emission latency stats", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("walk");
    engine.next();
    engine.next();

    const report = devtools.getProfilerReport();
    expect(report.frameLatency.count).toBeGreaterThanOrEqual(3);
    expect(report.frameLatency.maxMs).toBeGreaterThanOrEqual(report.frameLatency.minMs);
    expect(report.frameLatency.avgMs).toBeGreaterThanOrEqual(0);
  });

  test("wraps plugins registered before devtools", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    engine.use(slowPlugin("first", 2));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("walk");
    engine.next();

    const report = devtools.getProfilerReport();
    const first = report.hooks.find((h) => h.pluginName === "first");
    expect(first).toBeDefined();
    expect(first!.callCount).toBeGreaterThan(0);
  });
});
