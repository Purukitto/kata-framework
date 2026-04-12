import { expect, test, describe, mock } from "bun:test";
import { WebAudioManager } from "../src/audio/web-audio";

function setupSuspendedContext() {
  let state: AudioContextState = "suspended";
  let fetchCallCount = 0;

  const ctx = {
    get state() {
      return state;
    },
    currentTime: 0,
    destination: {},
    createGain: mock(() => ({
      gain: { value: 1, setValueAtTime: mock(() => {}), linearRampToValueAtTime: mock(() => {}) },
      connect: mock(() => {}),
    })),
    createBufferSource: mock(() => ({
      buffer: null,
      loop: false,
      connect: mock(() => {}),
      start: mock(() => {}),
      stop: mock(() => {}),
    })),
    decodeAudioData: mock(() =>
      Promise.resolve({ duration: 5, length: 220500, sampleRate: 44100 } as AudioBuffer)
    ),
    resume: mock(() => {
      state = "running";
      return Promise.resolve();
    }),
  };

  (globalThis as any).AudioContext = mock(() => ctx);
  (globalThis as any).fetch = mock(() => {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  });

  return { ctx, getFetchCount: () => fetchCallCount };
}

describe("Web Audio Autoplay Policy", () => {
  test("AudioContext starts suspended — commands are queued", () => {
    const { getFetchCount } = setupSuspendedContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6 } },
    });

    // Send play command while suspended
    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });

    // Fetch should NOT have been called — command was queued
    expect(getFetchCount()).toBe(0);
  });

  test("resume() resumes AudioContext after user gesture", async () => {
    const { ctx } = setupSuspendedContext();
    const audio = new WebAudioManager();

    await audio.resume();

    expect(ctx.resume).toHaveBeenCalled();
    expect(audio.contextState).toBe("running");
  });

  test("queued play commands execute after resume", async () => {
    const { getFetchCount } = setupSuspendedContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6 } },
    });

    // Queue commands while suspended
    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    audio.handler({ action: "play", id: "sfx", channel: "sfx", src: "click.wav" });

    expect(getFetchCount()).toBe(0);

    // Resume — queued commands should now execute
    await audio.resume();
    await new Promise((r) => setTimeout(r, 50));

    expect(getFetchCount()).toBe(2);
  });

  test("commands after resume execute immediately", async () => {
    const { getFetchCount } = setupSuspendedContext();
    const audio = new WebAudioManager();

    await audio.resume();

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    expect(getFetchCount()).toBe(1);
  });
});
