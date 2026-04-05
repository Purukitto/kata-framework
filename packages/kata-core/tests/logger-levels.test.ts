import { expect, test, describe } from "bun:test";
import { loggerPlugin } from "../src/plugins/logger";
import type { LogEntry } from "../src/plugins/logger";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("logger — levels", () => {
  test("'quiet' outputs nothing for normal flow", () => {
    const output: LogEntry[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(loggerPlugin({ level: "quiet", output: (e) => output.push(e) }));
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();

    expect(output).toHaveLength(0);
  });

  test("'quiet' still records entries internally", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "quiet" });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    expect(logger.getEntries().length).toBeGreaterThan(0);
  });

  test("'normal' outputs scene changes, choices, and end only", () => {
    const output: LogEntry[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
      {
        type: "choice",
        choices: [{ id: "c1", label: "Go", target: null }],
      },
    ]);
    const engine = new KataEngine();
    engine.use(loggerPlugin({ level: "normal", output: (e) => output.push(e) }));
    engine.registerScene(scene);
    engine.start("s1");
    engine.next(); // advance to choice
    engine.makeChoice("c1"); // triggers onChoice then end

    const hooks = output.map((e) => e.hook);
    expect(hooks).toContain("beforeSceneChange");
    expect(hooks).toContain("onChoice");
    expect(hooks).toContain("onEnd");
    expect(hooks).not.toContain("beforeAction");
    expect(hooks).not.toContain("afterAction");
  });

  test("'verbose' outputs everything", () => {
    const output: LogEntry[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(loggerPlugin({ level: "verbose", output: (e) => output.push(e) }));
    engine.registerScene(scene);
    engine.start("s1");
    engine.next();

    const hooks = new Set(output.map((e) => e.hook));
    expect(hooks.has("beforeSceneChange")).toBe(true);
    expect(hooks.has("beforeAction")).toBe(true);
    expect(hooks.has("afterAction")).toBe(true);
    expect(hooks.has("onEnd")).toBe(true);
  });

  test("setLevel changes filtering at runtime", () => {
    const output: LogEntry[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Line 1" },
      { type: "text", speaker: "A", content: "Line 2" },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "quiet", output: (e) => output.push(e) });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    expect(output).toHaveLength(0);

    logger.setLevel("verbose");
    engine.next(); // now should output

    expect(output.length).toBeGreaterThan(0);
  });
});
