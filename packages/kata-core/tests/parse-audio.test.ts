import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { parseKataWithDiagnostics } from "../src/parser/diagnostics";

describe("Parse [audio] directive", () => {
  test('[audio play bgm "file.mp3"] parses to correct audio action', () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

[audio play bgm "night-rain.mp3"]

:: Narrator :: After music
`);
    expect(scene.actions).toHaveLength(3);
    expect(scene.actions[1]).toEqual({
      type: "audio",
      command: {
        action: "play",
        id: "bgm",
        channel: "bgm",
        src: "night-rain.mp3",
        loop: false,
      },
    });
  });

  test("[audio stop sfx] parses to stop command", () => {
    const scene = parseKata(`---
id: test
---
[audio stop sfx]
`);
    expect(scene.actions).toHaveLength(1);
    expect(scene.actions[0]).toEqual({
      type: "audio",
      command: { action: "stop", id: "sfx", channel: "sfx" },
    });
  });

  test("[audio pause bgm] parses to pause command", () => {
    const scene = parseKata(`---
id: test
---
[audio pause bgm]
`);
    expect(scene.actions).toHaveLength(1);
    expect(scene.actions[0]).toEqual({
      type: "audio",
      command: { action: "pause", id: "bgm", channel: "bgm" },
    });
  });

  test("[audio volume bgm 0.5] parses to volume command with numeric value", () => {
    const scene = parseKata(`---
id: test
---
[audio volume bgm 0.5]
`);
    expect(scene.actions).toHaveLength(1);
    expect(scene.actions[0]).toEqual({
      type: "audio",
      command: { action: "volume", channel: "bgm", value: 0.5 },
    });
  });

  test("[audio volume bgm 0.3] parses integer-like float", () => {
    const scene = parseKata(`---
id: test
---
[audio volume bgm 0.3]
`);
    const cmd = (scene.actions[0] as any).command;
    expect(cmd.action).toBe("volume");
    expect(cmd.value).toBeCloseTo(0.3);
  });

  test("multiple audio actions in sequence all parse", () => {
    const scene = parseKata(`---
id: test
---
[audio play bgm "night-rain.mp3"]

[audio play sfx "thunder.wav"]

[audio stop bgm]

[audio volume bgm 0.3]
`);
    expect(scene.actions).toHaveLength(4);
    expect(scene.actions[0]!.type).toBe("audio");
    expect(scene.actions[1]!.type).toBe("audio");
    expect(scene.actions[2]!.type).toBe("audio");
    expect(scene.actions[3]!.type).toBe("audio");
  });

  test("audio actions interleave with text actions", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: The rain begins to fall.

[audio play bgm "night-rain.mp3"]

:: Narrator :: A distant rumble of thunder.

[audio play sfx "thunder.wav"]

:: Narrator :: The storm passes.

[audio stop bgm]
`);
    expect(scene.actions).toHaveLength(6);
    expect(scene.actions[0]!.type).toBe("text");
    expect(scene.actions[1]!.type).toBe("audio");
    expect(scene.actions[2]!.type).toBe("text");
    expect(scene.actions[3]!.type).toBe("audio");
    expect(scene.actions[4]!.type).toBe("text");
    expect(scene.actions[5]!.type).toBe("audio");
  });
});

describe("[audio] diagnostics", () => {
  test("unknown action verb produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[audio fadeout bgm]
`);
    expect(diagnostics.some((d) => d.message.includes("unknown action verb"))).toBe(true);
  });

  test("missing src for play produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[audio play bgm]
`);
    expect(diagnostics.some((d) => d.message.includes("missing src"))).toBe(true);
  });

  test("missing channel produces a diagnostic", () => {
    const { diagnostics } = parseKataWithDiagnostics(`---
id: test
---
[audio unknownverb]
`);
    expect(
      diagnostics.some(
        (d) => d.message.includes("channel") || d.message.includes("unknown action verb")
      )
    ).toBe(true);
  });
});
