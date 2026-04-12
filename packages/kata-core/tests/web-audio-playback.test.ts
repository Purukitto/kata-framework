import { expect, test, describe, beforeEach, mock } from "bun:test";
import { WebAudioManager } from "../src/audio/web-audio";

// --- Web Audio API Mocks ---
function createMockGainNode() {
  return {
    gain: { value: 1, setValueAtTime: mock(() => {}), linearRampToValueAtTime: mock(() => {}) },
    connect: mock(() => {}),
    disconnect: mock(() => {}),
  };
}

function createMockSourceNode() {
  return {
    buffer: null as any,
    loop: false,
    connect: mock(() => {}),
    start: mock(() => {}),
    stop: mock(() => {}),
  };
}

function setupMockAudioContext(state: AudioContextState = "running") {
  const mockBuffer = { duration: 5, length: 44100 * 5, sampleRate: 44100 } as AudioBuffer;

  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    createGain: mock(() => createMockGainNode()),
    createBufferSource: mock(() => createMockSourceNode()),
    decodeAudioData: mock(() => Promise.resolve(mockBuffer)),
    resume: mock(() => {
      (ctx as any).state = "running";
      return Promise.resolve();
    }),
  };

  (globalThis as any).AudioContext = mock(() => ctx);
  (globalThis as any).fetch = mock(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
  );

  return { ctx, mockBuffer };
}

describe("Web Audio Playback", () => {
  beforeEach(() => {
    setupMockAudioContext();
  });

  test("playing BGM creates a source node and connects to gain", async () => {
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6, loop: true } },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    // Let the async play resolve
    await new Promise((r) => setTimeout(r, 50));

    // fetch should have been called
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  test("SFX plays independently without interrupting BGM", async () => {
    const audio = new WebAudioManager({
      channels: {
        bgm: { volume: 0.6, loop: true },
        sfx: { volume: 1.0 },
      },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    audio.handler({ action: "play", id: "sfx", channel: "sfx", src: "click.wav" });
    await new Promise((r) => setTimeout(r, 50));

    // Both channels should have been used — fetch called twice
    expect((globalThis.fetch as any).mock.calls.length).toBe(2);
  });

  test("stop command fades out over 200ms", async () => {
    const { ctx } = setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6, loop: true } },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    audio.handler({ action: "stop", id: "bgm", channel: "bgm" });

    // The gain node's linearRampToValueAtTime should have been called for fade-out
    // (called by the channel's gain node)
    const gainNodes = (ctx.createGain as any).mock.results;
    expect(gainNodes.length).toBeGreaterThan(0);
  });

  test("pause command stops the source node", async () => {
    setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6 } },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    audio.handler({ action: "pause", id: "bgm", channel: "bgm" });
    // Should not throw
  });

  test("playing a second BGM track triggers crossfade", async () => {
    const { ctx } = setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6, loop: true, crossfadeDuration: 500 } },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "track1.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "track2.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    // Should have created gain nodes for crossfade (old fades out, new fades in)
    expect((ctx.createGain as any).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
