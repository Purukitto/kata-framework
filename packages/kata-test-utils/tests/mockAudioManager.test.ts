import { expect, test, describe } from "bun:test";
import { mockAudioManager } from "../src/mockAudioManager";
import { KataEngine } from "@kata-framework/core";
import type { KSONScene, AudioCommand } from "@kata-framework/core";

describe("mockAudioManager", () => {
  test("records audio commands", () => {
    const { handler, commands } = mockAudioManager();

    const scene: KSONScene = {
      meta: { id: "s1" },
      script: "",
      actions: [
        { type: "audio", command: { action: "play", id: "bgm", loop: true } },
        { type: "text", speaker: "A", content: "hello" },
      ],
    };

    const engine = new KataEngine();
    engine.registerScene(scene);
    engine.on("audio", handler);

    engine.start("s1");

    expect(commands).toHaveLength(1);
    expect(commands[0]!.action).toBe("play");
    expect(commands[0]!.id).toBe("bgm");
  });

  test("lastCommand returns most recent", () => {
    const { handler, lastCommand } = mockAudioManager();

    handler({ action: "play", id: "a" });
    handler({ action: "stop", id: "b" });

    expect(lastCommand()!.action).toBe("stop");
    expect(lastCommand()!.id).toBe("b");
  });

  test("reset clears commands", () => {
    const { handler, commands, reset, lastCommand } = mockAudioManager();

    handler({ action: "play", id: "x" });
    expect(commands).toHaveLength(1);

    reset();
    expect(commands).toHaveLength(0);
    expect(lastCommand()).toBeUndefined();
  });
});
