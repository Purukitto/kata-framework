import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";
import { KataEngine } from "../src/runtime/index";

describe("Runtime audio from .kata syntax", () => {
  test('audio actions from .kata syntax emit "audio" events correctly', () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

[audio play bgm "night-rain.mp3"]

:: Narrator :: Done
`);

    const engine = new KataEngine({});
    engine.registerScene(scene);

    const audioCommands: any[] = [];
    engine.on("audio", (cmd: any) => audioCommands.push(cmd));

    engine.start("test");
    // First frame is text "Hello", next should fire audio then auto-advance to "Done"
    engine.next();

    expect(audioCommands).toHaveLength(1);
    expect(audioCommands[0]).toEqual({
      action: "play",
      id: "bgm",
      channel: "bgm",
      src: "night-rain.mp3",
      loop: false,
    });
  });

  test("audio actions auto-advance (fire-and-forget)", () => {
    const scene = parseKata(`---
id: test
---
[audio play bgm "music.mp3"]

:: Narrator :: After audio
`);

    const engine = new KataEngine({});
    engine.registerScene(scene);

    const frames: any[] = [];
    engine.on("update", (frame: any) => frames.push(frame));

    engine.start("test");
    // Audio action at index 0 should auto-advance to text at index 1
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[frames.length - 1].action.type).toBe("text");
    expect(frames[frames.length - 1].action.content).toBe("After audio");
  });

  test("multiple audio actions in sequence all fire", () => {
    const scene = parseKata(`---
id: test
---
[audio play bgm "music.mp3"]

[audio play sfx "click.wav"]

:: Narrator :: After both
`);

    const engine = new KataEngine({});
    engine.registerScene(scene);

    const audioCommands: any[] = [];
    engine.on("audio", (cmd: any) => audioCommands.push(cmd));

    engine.start("test");
    // Both audio actions should fire during auto-advance chain
    expect(audioCommands).toHaveLength(2);
    expect(audioCommands[0].src).toBe("music.mp3");
    expect(audioCommands[1].src).toBe("click.wav");
  });

  test("stop and volume commands emit correctly", () => {
    const scene = parseKata(`---
id: test
---
[audio stop bgm]

[audio volume bgm 0.3]

:: Narrator :: Done
`);

    const engine = new KataEngine({});
    engine.registerScene(scene);

    const audioCommands: any[] = [];
    engine.on("audio", (cmd: any) => audioCommands.push(cmd));

    engine.start("test");

    expect(audioCommands).toHaveLength(2);
    expect(audioCommands[0].action).toBe("stop");
    expect(audioCommands[0].channel).toBe("bgm");
    expect(audioCommands[1].action).toBe("volume");
    expect(audioCommands[1].value).toBeCloseTo(0.3);
  });
});
