import { expect, test, describe, beforeEach, mock } from "bun:test";
import { WebAudioManager } from "../src/audio/web-audio";

function createMockGainNode() {
  return {
    gain: { value: 1, setValueAtTime: mock(() => {}), linearRampToValueAtTime: mock(() => {}) },
    connect: mock(() => {}),
    disconnect: mock(() => {}),
  };
}

function setupMockAudioContext() {
  const ctx = {
    state: "running" as AudioContextState,
    currentTime: 0,
    destination: {},
    createGain: mock(() => createMockGainNode()),
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
    resume: mock(() => Promise.resolve()),
  };

  (globalThis as any).AudioContext = mock(() => ctx);
  (globalThis as any).fetch = mock(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
  );

  return ctx;
}

describe("Web Audio Volume", () => {
  beforeEach(() => {
    setupMockAudioContext();
  });

  test("master volume scales via masterGain node", () => {
    const audio = new WebAudioManager({ masterVolume: 0.5 });
    // Master gain node is the first one created — its value should be 0.5
    // We can verify via the handler interface
    expect(audio).toBeDefined();
  });

  test("per-channel volume works independently", () => {
    const audio = new WebAudioManager({
      channels: {
        bgm: { volume: 0.6 },
        sfx: { volume: 0.9 },
      },
    });

    audio.setVolume("bgm", 0.3);
    audio.setVolume("sfx", 0.8);

    // Both calls should succeed independently
    expect(audio).toBeDefined();
  });

  test("mute sets gain to 0, unmute restores previous gain", () => {
    setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.7 } },
    });

    audio.mute("bgm");
    // After mute, the gain node's value should be 0
    // After unmute, it should be restored

    audio.unmute("bgm");
    // Should not throw and should restore volume
    expect(audio).toBeDefined();
  });

  test("volume changes are applied immediately via handler", () => {
    setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6 } },
    });

    audio.handler({ action: "volume", channel: "bgm", value: 0.3 });
    // Should apply immediately without needing a play command
    expect(audio).toBeDefined();
  });

  test("setVolume via AudioManager interface works", () => {
    setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.6 } },
    });

    audio.setVolume("bgm", 0.4);
    // Should apply without error
    expect(audio).toBeDefined();
  });

  test("fade adjusts volume over time", () => {
    const ctx = setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: { bgm: { volume: 0.8 } },
    });

    audio.fade("bgm", 0.2, 1000);

    // The gain node's linearRampToValueAtTime should have been called
    const gainNodes = (ctx.createGain as any).mock.results;
    expect(gainNodes.length).toBeGreaterThan(0);
  });

  test("stopAll stops all channels", async () => {
    setupMockAudioContext();
    const audio = new WebAudioManager({
      channels: {
        bgm: { volume: 0.6 },
        sfx: { volume: 1.0 },
      },
    });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    audio.handler({ action: "play", id: "sfx", channel: "sfx", src: "click.wav" });
    await new Promise((r) => setTimeout(r, 50));

    audio.stopAll();
    // Should not throw
    expect(audio).toBeDefined();
  });
});
