import { expect, test, describe } from "bun:test";
import { NoopAudioManager } from "../src/audio/index";
import { KataEngine } from "../src/runtime/index";
import { SnapshotManager } from "../src/runtime/snapshot";
import type { KSONScene, KSONFrame, AudioCommand } from "../src/types";

describe("NoopAudioManager", () => {
  test("implements all methods without throwing", () => {
    const mgr = new NoopAudioManager();
    expect(() => mgr.play("bgm")).not.toThrow();
    expect(() => mgr.stop("bgm")).not.toThrow();
    expect(() => mgr.setVolume("bgm", 0.5)).not.toThrow();
    expect(() => mgr.fade("bgm", 0, 1000)).not.toThrow();
    expect(() => mgr.registerLayer("bgm", { volume: 0.8, loop: true })).not.toThrow();
  });
});

describe("Engine audio actions", () => {
  const audioScene: KSONScene = {
    meta: { id: "audio-test" },
    script: "",
    actions: [
      { type: "audio", command: { action: "play", id: "bgm", loop: true } },
      { type: "text", speaker: "Narrator", content: "Music is playing." },
    ],
  };

  test("emits 'audio' event with correct AudioCommand payload", () => {
    const engine = new KataEngine();
    engine.registerScene(audioScene);

    const commands: AudioCommand[] = [];
    engine.on("audio", (cmd: AudioCommand) => commands.push(cmd));

    engine.start("audio-test");

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({ action: "play", id: "bgm", loop: true });
  });

  test("auto-advances past audio actions (doesn't block)", () => {
    const engine = new KataEngine();
    engine.registerScene(audioScene);

    const frames: KSONFrame[] = [];
    engine.on("update", (f: KSONFrame) => frames.push(f));

    engine.start("audio-test");

    // Should have auto-advanced past the audio action to the text action
    expect(frames).toHaveLength(1);
    expect(frames[0].action.type).toBe("text");
    if (frames[0].action.type === "text") {
      expect(frames[0].action.content).toBe("Music is playing.");
    }
  });

  test("audio action at end of scene emits end", () => {
    const scene: KSONScene = {
      meta: { id: "audio-end" },
      script: "",
      actions: [
        { type: "text", speaker: "N", content: "Before audio." },
        { type: "audio", command: { action: "stop", id: "bgm" } },
      ],
    };
    const engine = new KataEngine();
    engine.registerScene(scene);

    let ended = false;
    engine.on("end", () => { ended = true; });

    engine.start("audio-end");
    engine.next(); // advance past text -> hits audio at end

    expect(ended).toBe(true);
  });
});

describe("Snapshot Zod schema validates audio actions", () => {
  test("round-trip audio action through snapshot", () => {
    const scene: KSONScene = {
      meta: { id: "snap-audio" },
      script: "",
      actions: [
        { type: "audio", command: { action: "fade", id: "bgm", toVolume: 0, durationMs: 2000 } },
        { type: "text", speaker: "N", content: "Done." },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.start("snap-audio");

    const snapshot = engine.getSnapshot();
    expect(snapshot.expandedActions).toBeDefined();

    // Load into a fresh engine — should not throw (Zod validates)
    const engine2 = new KataEngine();
    engine2.registerScene(scene);
    expect(() => engine2.loadSnapshot(snapshot)).not.toThrow();
  });
});
