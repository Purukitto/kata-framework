import { describe, test, expect } from "bun:test";
import { parseKata, mergeScene, type KSONScene, type ScenePatch } from "@kata-framework/core";
import { readFileSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");
const modsDir = join(import.meta.dir, "..", "..", "mods");

describe("modding", () => {
  test("caller_ray.kata scene parses correctly", () => {
    const source = readFileSync(
      join(modsDir, "alternate-caller", "scenes", "caller_ray.kata"),
      "utf-8"
    );
    const scene = parseKata(source);

    expect(scene.meta.id).toBe("caller_ray");
    expect(scene.meta.title).toBe("Caller — Ray the Engineer");

    const textActions = scene.actions.filter((a: any) => a.type === "text");
    expect(textActions.length).toBeGreaterThan(0);

    // Ray speaks in the scene
    const rayLines = textActions.filter((a: any) => a.speaker === "Ray");
    expect(rayLines.length).toBeGreaterThan(0);

    // Scene has exec block for intel/listener boost
    const execActions = scene.actions.filter((a: any) => a.type === "exec");
    expect(execActions.length).toBe(1);

    // Scene links back to booth
    const choiceAction = scene.actions.find((a: any) => a.type === "choice");
    expect(choiceAction).toBeDefined();
    expect(choiceAction.choices[0].target).toBe("booth");
  });

  test("mod manifest loads correctly", () => {
    const manifest = JSON.parse(
      readFileSync(join(modsDir, "alternate-caller", "manifest.json"), "utf-8")
    );

    expect(manifest.id).toBe("alternate-caller");
    expect(manifest.name).toBe("Alternate Caller: Ray");
    expect(manifest.scenes.length).toBe(1);
    expect(manifest.patches.length).toBe(1);
    expect(manifest.patches[0].target).toBe("booth");
  });

  test("booth patch applies correctly via mergeScene", () => {
    const boothSource = readFileSync(join(scenesDir, "studio", "booth.kata"), "utf-8");
    const booth = parseKata(boothSource);

    const patch: ScenePatch = JSON.parse(
      readFileSync(join(modsDir, "alternate-caller", "patches", "booth.patch.json"), "utf-8")
    );

    const patched = mergeScene(booth, patch);

    // Meta should be updated
    expect(patched.meta.title).toBe("The Broadcast Booth (Modded)");

    // Should have more actions than original (inserted text about strange signal)
    expect(patched.actions.length).toBeGreaterThan(booth.actions.length);

    // Find the inserted action
    const insertedText = patched.actions.find(
      (a: any) => a.type === "text" && a.content.includes("strange signal")
    );
    expect(insertedText).toBeDefined();
  });

  test("mergeScene preserves original scene ID", () => {
    const boothSource = readFileSync(join(scenesDir, "studio", "booth.kata"), "utf-8");
    const booth = parseKata(boothSource);

    const patch: ScenePatch = JSON.parse(
      readFileSync(join(modsDir, "alternate-caller", "patches", "booth.patch.json"), "utf-8")
    );

    const patched = mergeScene(booth, patch);
    expect(patched.meta.id).toBe("booth");
  });

  test("mod scene can be registered alongside base scenes", () => {
    const { KataEngine } = require("@kata-framework/core");
    const engine = new KataEngine();

    // Register base scene
    const boothSource = readFileSync(join(scenesDir, "studio", "booth.kata"), "utf-8");
    const booth = parseKata(boothSource);
    engine.registerScene(booth);

    // Register mod scene
    const raySource = readFileSync(
      join(modsDir, "alternate-caller", "scenes", "caller_ray.kata"),
      "utf-8"
    );
    const ray = parseKata(raySource);
    engine.registerScene(ray);

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));

    engine.start("caller_ray");

    // Advance past auto-advancing actions (visual) to reach text
    let safety = 0;
    while (frames.filter((f: any) => f.action.type === "text").length === 0 && safety < 10) {
      engine.next();
      safety++;
    }

    expect(frames.length).toBeGreaterThan(0);
    const textFrame = frames.find((f: any) => f.action.type === "text");
    expect(textFrame).toBeDefined();
    expect(textFrame.action.speaker).toBe("Reva");
  });
});
