import { describe, test, expect } from "bun:test";
import { KataEngine } from "@kata-framework/core";
import { mockAudioManager } from "@kata-framework/test-utils";
import type { KSONScene, AudioCommand } from "@kata-framework/core";

describe("audio events", () => {
  test("engine emits audio events for audio actions", () => {
    const engine = new KataEngine();
    const audio = mockAudioManager();

    // Create a scene with audio actions programmatically (KSON, not .kata syntax)
    const scene: KSONScene = {
      meta: { id: "audio_test", title: "Audio Test" },
      script: "",
      actions: [
        { type: "text", speaker: "Narrator", content: "Starting broadcast." },
        { type: "audio", command: { action: "play", id: "radio-static", loop: true } },
        { type: "text", speaker: "Narrator", content: "Static fills the air." },
        { type: "audio", command: { action: "setVolume", id: "radio-static", volume: 0.5 } },
        { type: "text", speaker: "Narrator", content: "The end." },
      ],
    };

    engine.registerScene(scene);
    engine.on("audio", audio.handler);

    const frames: any[] = [];
    engine.on("update", (f: any) => frames.push(f));

    engine.start("audio_test");
    // First frame is text "Starting broadcast"
    expect(frames[0].action.type).toBe("text");

    engine.next();
    // Audio action fires, auto-advances to next text
    expect(audio.commands.length).toBe(1);
    expect(audio.commands[0]).toEqual({ action: "play", id: "radio-static", loop: true });

    engine.next();
    // Another audio + auto-advance
    expect(audio.commands.length).toBe(2);
    expect(audio.commands[1]).toEqual({ action: "setVolume", id: "radio-static", volume: 0.5 });
  });

  test("mockAudioManager tracks lastCommand", () => {
    const audio = mockAudioManager();
    const cmd1: AudioCommand = { action: "play", id: "bgm" };
    const cmd2: AudioCommand = { action: "stop", id: "bgm" };

    audio.handler(cmd1);
    expect(audio.lastCommand()).toEqual(cmd1);

    audio.handler(cmd2);
    expect(audio.lastCommand()).toEqual(cmd2);
    expect(audio.commands.length).toBe(2);
  });

  test("mockAudioManager reset clears state", () => {
    const audio = mockAudioManager();
    audio.handler({ action: "play", id: "test" });
    expect(audio.commands.length).toBe(1);

    audio.reset();
    expect(audio.commands.length).toBe(0);
    expect(audio.lastCommand()).toBeUndefined();
  });
});
