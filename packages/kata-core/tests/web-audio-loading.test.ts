import { expect, test, describe, beforeEach, mock } from "bun:test";
import { WebAudioManager, AudioBufferCache } from "../src/audio/web-audio";

function setupMockAudioContext() {
  let fetchCallCount = 0;
  const mockBuffer = { duration: 5, length: 220500, sampleRate: 44100 } as AudioBuffer;

  const ctx = {
    state: "running" as AudioContextState,
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
    decodeAudioData: mock(() => Promise.resolve(mockBuffer)),
    resume: mock(() => Promise.resolve()),
  };

  (globalThis as any).AudioContext = mock(() => ctx);
  (globalThis as any).fetch = mock(() => {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  });

  return { ctx, mockBuffer, getFetchCount: () => fetchCallCount };
}

describe("AudioBufferCache", () => {
  test("caches and retrieves buffers", () => {
    const cache = new AudioBufferCache();
    const buf = { duration: 1 } as AudioBuffer;
    cache.set("test.mp3", buf);
    expect(cache.get("test.mp3")).toBe(buf);
  });

  test("returns undefined for missing keys", () => {
    const cache = new AudioBufferCache();
    expect(cache.get("missing.mp3")).toBeUndefined();
  });

  test("LRU eviction when max size reached", () => {
    const cache = new AudioBufferCache(3);
    cache.set("a.mp3", { duration: 1 } as AudioBuffer);
    cache.set("b.mp3", { duration: 2 } as AudioBuffer);
    cache.set("c.mp3", { duration: 3 } as AudioBuffer);

    // Access 'a' to make it most recently used
    cache.get("a.mp3");

    // Adding 'd' should evict 'b' (least recently used)
    cache.set("d.mp3", { duration: 4 } as AudioBuffer);
    expect(cache.has("a.mp3")).toBe(true);
    expect(cache.has("b.mp3")).toBe(false);
    expect(cache.has("c.mp3")).toBe(true);
    expect(cache.has("d.mp3")).toBe(true);
  });

  test("clear evicts all entries", () => {
    const cache = new AudioBufferCache();
    cache.set("a.mp3", { duration: 1 } as AudioBuffer);
    cache.set("b.mp3", { duration: 2 } as AudioBuffer);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("Web Audio Loading", () => {
  beforeEach(() => {
    setupMockAudioContext();
  });

  test("audio files are fetched and decoded on first play", async () => {
    const { getFetchCount } = setupMockAudioContext();
    const audio = new WebAudioManager({ basePath: "/audio/" });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    expect(getFetchCount()).toBe(1);
  });

  test("decoded buffers are cached (second play is instant)", async () => {
    const { getFetchCount } = setupMockAudioContext();
    const audio = new WebAudioManager({ basePath: "/audio/" });

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "music.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    // Should only fetch once — second play uses cache
    expect(getFetchCount()).toBe(1);
  });

  test("failed fetch does not crash", async () => {
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 })
    );

    const ctx = {
      state: "running" as AudioContextState,
      currentTime: 0,
      destination: {},
      createGain: mock(() => ({
        gain: { value: 1, setValueAtTime: mock(() => {}), linearRampToValueAtTime: mock(() => {}) },
        connect: mock(() => {}),
      })),
      createBufferSource: mock(() => ({
        buffer: null, loop: false, connect: mock(() => {}), start: mock(() => {}), stop: mock(() => {}),
      })),
      decodeAudioData: mock(() => Promise.resolve({} as AudioBuffer)),
      resume: mock(() => Promise.resolve()),
    };
    (globalThis as any).AudioContext = mock(() => ctx);

    const audio = new WebAudioManager();
    audio.handler({ action: "play", id: "bgm", channel: "bgm", src: "missing.mp3" });
    await new Promise((r) => setTimeout(r, 50));

    // Should not throw
    expect(audio).toBeDefined();
  });

  test("preloading decodes audio files ahead of time", async () => {
    const { ctx, getFetchCount } = setupMockAudioContext();
    const audio = new WebAudioManager({ basePath: "/audio/" });

    await audio.preload(["track1.mp3", "track2.mp3"]);

    expect(getFetchCount()).toBe(2);
    expect((ctx.decodeAudioData as any).mock.calls.length).toBe(2);
    expect(audio.cache.has("/audio/track1.mp3")).toBe(true);
    expect(audio.cache.has("/audio/track2.mp3")).toBe(true);
  });
});
