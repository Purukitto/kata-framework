import { expect, test, describe } from "bun:test";
import { loggerPlugin } from "../src/plugins/logger";
import type { LoggerPlugin } from "../src/plugins/logger";
import { KataEngine } from "../src/runtime/index";
import type { KSONScene, KSONAction, KSONFrame } from "../src/types";

function makeScene(id: string, actions: KSONAction[]): KSONScene {
  return { meta: { id }, script: "", actions };
}

describe("logger — hooks", () => {
  test("logs beforeAction and afterAction for text actions", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "verbose" });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    const entries = logger.getEntries();
    const hooks = entries.map((e) => e.hook);
    expect(hooks).toContain("beforeSceneChange");
    expect(hooks).toContain("beforeAction");
    expect(hooks).toContain("afterAction");
  });

  test("logs onChoice with choice ID and label", () => {
    const scene = makeScene("s1", [
      {
        type: "choice",
        choices: [
          { id: "c1", label: "Pick me", target: null },
        ],
      },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "verbose" });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");
    engine.makeChoice("c1");

    const choiceEntries = logger.getEntries().filter((e) => e.hook === "onChoice");
    expect(choiceEntries).toHaveLength(1);
    expect(choiceEntries[0].data?.choiceId).toBe("c1");
    expect(choiceEntries[0].data?.label).toBe("Pick me");
  });

  test("logs beforeSceneChange with from/to scene IDs", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "verbose" });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");

    const sceneEntries = logger.getEntries().filter((e) => e.hook === "beforeSceneChange");
    expect(sceneEntries).toHaveLength(1);
    expect(sceneEntries[0].data?.toId).toBe("s1");
  });

  test("logs onEnd with scene ID", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Hello" },
    ]);
    const engine = new KataEngine();
    const logger = loggerPlugin({ level: "verbose" });
    engine.use(logger);
    engine.registerScene(scene);
    engine.start("s1");
    engine.next(); // triggers end

    const endEntries = logger.getEntries().filter((e) => e.hook === "onEnd");
    expect(endEntries).toHaveLength(1);
    expect(endEntries[0].sceneId).toBe("s1");
  });

  test("beforeAction passes through action unchanged", () => {
    const scene = makeScene("s1", [
      { type: "text", speaker: "A", content: "Original" },
    ]);
    const engine = new KataEngine();
    engine.use(loggerPlugin({ level: "verbose" }));
    engine.registerScene(scene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f) => frames.push(f));
    engine.start("s1");

    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("Original");
    }
  });
});
