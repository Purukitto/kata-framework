import { expect, test, describe } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import { devtoolsPlugin } from "../src/devtoolsPlugin";

const SCENE = `---
id: shop
---

:: Vendor :: Welcome traveller

:: Vendor :: Buy something?

* [Yes] -> @shop
* [No]
`;

describe("devtoolsPlugin inspector", () => {
  test("inspector reports current scene, action index, and ctx", () => {
    const engine = new KataEngine({ gold: 50 });
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("shop");
    const state = devtools.getInspectorState();
    expect(state.currentSceneId).toBe("shop");
    expect(state.currentActionIndex).toBe(0);
    expect(state.ctx.gold).toBe(50);
    expect(state.pluginNames).toContain("devtools");
    expect(state.frameCount).toBe(1);
  });

  test("timeline records frames in order", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("shop");
    engine.next();
    engine.next();

    const timeline = devtools.getTimeline();
    expect(timeline.length).toBe(3);
    expect(timeline.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(timeline[2]!.actionType).toBe("choice");
  });

  test("getTimelineEntry returns the full frame for an index", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("shop");
    const entry = devtools.getTimelineEntry(0);
    expect(entry).toBeDefined();
    expect(entry!.frame.action.type).toBe("text");
    expect(entry!.frame.state.currentSceneId).toBe("shop");
  });

  test("event log includes update and end events", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(`---
id: tiny
---

:: A :: hi
`));
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    engine.start("tiny");
    engine.next();

    const log = devtools.getEventLog();
    const types = log.map((e) => e.type);
    expect(types).toContain("update");
    expect(types).toContain("end");
  });

  test("evalExpression reads from current ctx", () => {
    const engine = new KataEngine({ name: "Lyra", level: 7 });
    engine.registerScene(parseKata(`---
id: hello
---

:: Narrator :: hi
`));
    const devtools = devtoolsPlugin();
    engine.use(devtools);
    engine.start("hello");

    const r1 = devtools.evalExpression("name");
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.value).toBe("Lyra");

    const r2 = devtools.evalExpression("level * 2");
    if (r2.ok) expect(r2.value).toBe(14);
  });

  test("reset clears timeline and event log", () => {
    const engine = new KataEngine({});
    engine.registerScene(parseKata(SCENE));
    const devtools = devtoolsPlugin();
    engine.use(devtools);
    engine.start("shop");
    expect(devtools.getTimeline().length).toBe(1);

    devtools.reset();
    expect(devtools.getTimeline()).toEqual([]);
    expect(devtools.getEventLog()).toEqual([]);
  });
});
