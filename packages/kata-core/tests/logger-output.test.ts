import { expect, test, describe } from "bun:test";
import { loggerPlugin } from "../src/plugins/logger";
import type { LogEntry } from "../src/plugins/logger";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("logger — output", () => {
  test("custom output sink receives structured entries", () => {
    const output: LogEntry[] = [];
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(loggerPlugin({ level: "verbose", output: (e) => output.push(e) }));
    engine.registerScene(scene);
    engine.start("s1");

    expect(output.length).toBeGreaterThan(0);
    for (const entry of output) {
      expect(typeof entry.timestamp).toBe("number");
      expect(typeof entry.hook).toBe("string");
    }
  });

  test("entries include timestamp and hook name", () => {
    const logger = loggerPlugin({ level: "verbose" });
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(logger);
    engine.registerScene(scene);

    const before = Date.now();
    engine.start("s1");
    const after = Date.now();

    for (const entry of logger.getEntries()) {
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
      expect(["beforeAction", "afterAction", "onChoice", "beforeSceneChange", "onEnd"]).toContain(entry.hook);
    }
  });

  test("beforeSceneChange entries include sceneId", () => {
    const logger = loggerPlugin({ level: "verbose" });
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    const sceneEntry = logger.getEntries().find((e) => e.hook === "beforeSceneChange");
    expect(sceneEntry).toBeDefined();
    expect(sceneEntry!.sceneId).toBe("s1");
  });

  test("beforeAction entries include actionType", () => {
    const logger = loggerPlugin({ level: "verbose" });
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    const actionEntry = logger.getEntries().find((e) => e.hook === "beforeAction");
    expect(actionEntry).toBeDefined();
    expect(actionEntry!.actionType).toBe("text");
  });

  test("clear removes all entries", () => {
    const logger = loggerPlugin({ level: "verbose" });
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    expect(logger.getEntries().length).toBeGreaterThan(0);
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  test("getEntries returns a copy (not the internal array)", () => {
    const logger = loggerPlugin({ level: "verbose" });
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    const entries1 = logger.getEntries();
    const entries2 = logger.getEntries();
    expect(entries1).not.toBe(entries2);
    expect(entries1).toEqual(entries2);
  });
});
