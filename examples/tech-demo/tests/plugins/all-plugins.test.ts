import { describe, test, expect } from "bun:test";
import { KataEngine, parseKata } from "@kata-framework/core";
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";
import { loggerPlugin } from "@kata-framework/core/plugins/logger";
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";
import { listenerCountPlugin } from "../../src/plugins/listener-count";
import type { GameStateSnapshot } from "@kata-framework/core";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function readScene(path: string): string {
  return readFileSync(join(scenesDir, path), "utf-8");
}

describe("all 6 plugins integration", () => {
  test("all plugins register without error", () => {
    const engine = new KataEngine();

    const saves: GameStateSnapshot[] = [];
    const warnings: Array<{ sceneId: string; tags: string[] }> = [];
    const logs: any[] = [];

    engine.use(analyticsPlugin());
    engine.use(profanityPlugin({ words: ["damn"], replacement: "[BLEEP]" }));
    engine.use(autoSavePlugin({ interval: "choice", onSave: (s) => saves.push(s) }));
    engine.use(loggerPlugin({ level: "verbose", output: (e) => logs.push(e) }));
    engine.use(contentWarningsPlugin({
      warnings: { expose: ["violence"] },
      onWarn: (id, tags) => warnings.push({ sceneId: id, tags }),
    }));
    engine.use(listenerCountPlugin());

    expect(engine.getPlugins().length).toBe(6);
    expect(engine.getPlugins()).toContain("analytics");
    expect(engine.getPlugins()).toContain("profanity-filter");
    expect(engine.getPlugins()).toContain("auto-save");
    expect(engine.getPlugins()).toContain("logger");
    expect(engine.getPlugins()).toContain("content-warnings");
    expect(engine.getPlugins()).toContain("listener-count");
  });

  test("plugins run during playthrough without conflicts", () => {
    const engine = new KataEngine();

    const saves: GameStateSnapshot[] = [];
    const warnings: Array<{ sceneId: string; tags: string[] }> = [];
    const logs: any[] = [];

    const analytics = analyticsPlugin();
    engine.use(analytics);
    engine.use(profanityPlugin({ words: ["damn"], replacement: "[BLEEP]" }));
    engine.use(autoSavePlugin({ interval: "scene-change", onSave: (s) => saves.push(s) }));
    engine.use(loggerPlugin({ level: "verbose", output: (e) => logs.push(e) }));
    engine.use(contentWarningsPlugin({
      warnings: { expose: ["distressing content"] },
      onWarn: (id, tags) => warnings.push({ sceneId: id, tags }),
    }));
    engine.use(listenerCountPlugin());

    // Register scenes
    const prologue = parseKata(readScene("prologue.kata"));
    const booth = parseKata(readScene("studio/booth.kata"));
    const shutdown = parseKata(readScene("endings/shutdown.kata"));
    engine.registerScene(prologue);
    engine.registerScene(booth);
    engine.registerScene(shutdown);

    let ended = false;
    engine.on("end", () => { ended = true; });

    // Start and advance through prologue
    engine.start("prologue");
    let safety = 0;
    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));

    // Auto-advance to end
    while (!ended && safety < 100) {
      const last = frames[frames.length - 1];
      if (!last) break;
      if (last.action.type === "choice") {
        // Pick the last choice (shutdown)
        const choices = last.action.choices;
        engine.makeChoice(choices[choices.length - 1].id);
      } else {
        engine.next();
      }
      safety++;
    }

    // Verify analytics tracked something
    const report = analytics.getReport();
    expect(Object.keys(report.sceneVisits).length).toBeGreaterThan(0);

    // Verify logger captured entries
    expect(logs.length).toBeGreaterThan(0);

    // Verify auto-save fired on scene changes
    expect(saves.length).toBeGreaterThan(0);
  });

  test("profanity filter censors bad words in text", () => {
    const engine = new KataEngine();
    engine.use(profanityPlugin({ words: ["damn"], replacement: "[BLEEP]" }));

    const scene = parseKata(`---
id: test
title: Test
---

:: Speaker :: Well damn, that's something.
`);
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));
    engine.start("test");

    const textFrame = frames.find((f: any) => f.action.type === "text");
    expect(textFrame.action.content).toContain("[BLEEP]");
    expect(textFrame.action.content).not.toContain("damn");
  });

  test("content warnings fire for tagged scenes", () => {
    const engine = new KataEngine();

    const warnings: string[] = [];
    engine.use(contentWarningsPlugin({
      warnings: { danger_zone: ["violence", "horror"] },
      onWarn: (id, tags) => warnings.push(id),
    }));

    const scene1 = parseKata(`---
id: safe
title: Safe
---

:: Narrator :: All good here.

* [Go to danger] -> @danger_zone
`);
    const scene2 = parseKata(`---
id: danger_zone
title: Danger
---

:: Narrator :: Something bad happens.
`);

    engine.registerScene(scene1);
    engine.registerScene(scene2);

    engine.start("safe");

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));

    // Advance to choice
    engine.next();
    // Make choice to go to danger_zone
    engine.makeChoice("c_0");

    expect(warnings).toContain("danger_zone");
  });
});
