import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import { devtoolsPlugin } from "../src/devtoolsPlugin";

const SCENE = `---
id: intro
---

:: Narrator :: line one

:: Narrator :: line two
`;

function makeEngine() {
  const engine = new KataEngine({});
  engine.registerScene(parseKata(SCENE));
  return engine;
}

describe("devtoolsPlugin attach", () => {
  let prevEnv: string | undefined;

  beforeEach(() => {
    prevEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
  });

  test("attaches to engine and records frames", () => {
    const engine = makeEngine();
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    expect(devtools.enabled).toBe(true);
    engine.start("intro");
    engine.next();

    const timeline = devtools.getTimeline();
    expect(timeline.length).toBe(2);
    expect(timeline[0]!.actionType).toBe("text");
    expect(timeline[0]!.sceneId).toBe("intro");
  });

  test("removing the plugin stops recording", () => {
    const engine = makeEngine();
    const devtools = devtoolsPlugin();
    engine.use(devtools);
    engine.start("intro");
    expect(devtools.getTimeline().length).toBe(1);

    engine.removePlugin("devtools");
    engine.next();

    expect(devtools.getTimeline().length).toBe(1);
  });

  test("disabled when NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    const engine = makeEngine();
    const devtools = devtoolsPlugin();
    expect(devtools.enabled).toBe(false);

    engine.use(devtools);
    engine.start("intro");
    engine.next();

    expect(devtools.getTimeline()).toEqual([]);
    expect(devtools.getEventLog()).toEqual([]);
  });

  test("explicit enabled: true overrides production check", () => {
    process.env.NODE_ENV = "production";
    const engine = makeEngine();
    const devtools = devtoolsPlugin({ enabled: true });
    engine.use(devtools);
    engine.start("intro");
    expect(devtools.enabled).toBe(true);
    expect(devtools.getTimeline().length).toBe(1);
  });

  test("subscribers are notified on frame updates", () => {
    const engine = makeEngine();
    const devtools = devtoolsPlugin();
    engine.use(devtools);

    let calls = 0;
    const unsub = devtools.subscribe(() => {
      calls++;
    });
    engine.start("intro");
    engine.next();
    unsub();
    engine.next();

    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
