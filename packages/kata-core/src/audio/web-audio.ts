import type { AudioCommand } from "../types";
import type { AudioManager } from "./index";

// Minimal Web Audio API type declarations for headless compatibility.
// These match the browser Web Audio API shape but don't require the DOM lib.
declare class AudioContext {
  readonly state: AudioContextState;
  readonly currentTime: number;
  readonly destination: AudioDestinationNode;
  createGain(): GainNode;
  createBufferSource(): AudioBufferSourceNode;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  resume(): Promise<void>;
}

type AudioContextState = "suspended" | "running" | "closed";

interface AudioDestinationNode extends AudioNode {
  readonly numberOfInputs: number;
}

interface AudioParam {
  value: number;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
}

interface AudioNode {
  connect(destination: AudioNode): void;
  disconnect(): void;
}

interface GainNode extends AudioNode {
  readonly gain: AudioParam;
}

interface AudioBufferSourceNode extends AudioNode {
  buffer: AudioBuffer | null;
  loop: boolean;
  start(when?: number): void;
  stop(when?: number): void;
}

interface AudioBuffer {
  readonly duration: number;
  readonly length: number;
  readonly sampleRate: number;
}

export interface ChannelConfig {
  volume?: number;
  loop?: boolean;
  crossfadeDuration?: number;
}

export interface WebAudioManagerOptions {
  basePath?: string;
  masterVolume?: number;
  channels?: Record<string, ChannelConfig>;
}

interface ChannelState {
  gainNode: GainNode;
  sourceNode: AudioBufferSourceNode | null;
  volume: number;
  muted: boolean;
  loop: boolean;
  crossfadeDuration: number;
  currentSrc: string | null;
}

/**
 * LRU cache for decoded AudioBuffer objects.
 */
export class AudioBufferCache {
  private cache = new Map<string, AudioBuffer>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): AudioBuffer | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: AudioBuffer): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Concrete AudioManager implementation using the Web Audio API.
 * Handles BGM, SFX, voice with crossfading, volume control, and autoplay policy.
 */
export class WebAudioManager implements AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private masterVolume: number;
  private channels = new Map<string, ChannelState>();
  private bufferCache: AudioBufferCache;
  private basePath: string;
  private pendingQueue: AudioCommand[] = [];
  private channelConfigs: Record<string, ChannelConfig>;

  constructor(options: WebAudioManagerOptions = {}) {
    this.basePath = options.basePath ?? "";
    this.masterVolume = options.masterVolume ?? 1.0;
    this.channelConfigs = options.channels ?? {};
    this.bufferCache = new AudioBufferCache();

    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.context.destination);

    // Pre-create channels from config
    for (const [name, config] of Object.entries(this.channelConfigs)) {
      this.ensureChannel(name, config);
    }

    this.handler = this.handler.bind(this);
  }

  private ensureChannel(name: string, config?: ChannelConfig): ChannelState {
    let state = this.channels.get(name);
    if (state) return state;

    const gainNode = this.context.createGain();
    const vol = config?.volume ?? 1.0;
    gainNode.gain.value = vol;
    gainNode.connect(this.masterGain);

    state = {
      gainNode,
      sourceNode: null,
      volume: vol,
      muted: false,
      loop: config?.loop ?? false,
      crossfadeDuration: config?.crossfadeDuration ?? 1000,
      currentSrc: null,
    };
    this.channels.set(name, state);
    return state;
  }

  /**
   * Event handler for engine "audio" events.
   */
  handler(command: AudioCommand): void {
    if (this.context.state === "suspended") {
      this.pendingQueue.push(command);
      return;
    }
    this.processCommand(command);
  }

  private processCommand(command: AudioCommand): void {
    switch (command.action) {
      case "play": {
        const channel = command.channel || command.id;
        const src = command.src || command.id;
        this.playChannel(channel, src, command.loop);
        break;
      }
      case "stop": {
        const channel = command.channel || command.id;
        this.stopChannel(channel);
        break;
      }
      case "pause": {
        const channel = command.channel || command.id;
        this.pauseChannel(channel);
        break;
      }
      case "volume": {
        this.setVolume(command.channel, command.value);
        break;
      }
      case "setVolume": {
        const channel = command.channel || command.id;
        this.setVolume(channel, command.volume);
        break;
      }
      case "fade": {
        this.fade(command.id, command.toVolume, command.durationMs);
        break;
      }
    }
  }

  private async playChannel(
    channelName: string,
    src: string,
    loop?: boolean
  ): Promise<void> {
    const state = this.ensureChannel(channelName, this.channelConfigs[channelName]);
    const url = this.basePath + src;

    try {
      let buffer = this.bufferCache.get(url);
      if (!buffer) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${url} (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(url, buffer);
      }

      // Crossfade: fade out old source if playing
      if (state.sourceNode) {
        const oldGain = state.gainNode;
        const fadeDuration = state.crossfadeDuration / 1000;
        oldGain.gain.setValueAtTime(oldGain.gain.value, this.context.currentTime);
        oldGain.gain.linearRampToValueAtTime(
          0,
          this.context.currentTime + fadeDuration
        );

        const oldSource = state.sourceNode;
        setTimeout(() => {
          try {
            oldSource.stop();
          } catch {
            // already stopped
          }
        }, state.crossfadeDuration);
      }

      // Create new source
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = loop ?? state.loop;

      // Create a fresh gain for crossfade-in
      const channelGain = this.context.createGain();
      const targetVol = state.muted ? 0 : state.volume;
      channelGain.gain.value = state.sourceNode ? 0 : targetVol; // start at 0 if crossfading
      channelGain.connect(this.masterGain);

      source.connect(channelGain);
      source.start(0);

      // Fade in if crossfading
      if (state.sourceNode) {
        const fadeDuration = state.crossfadeDuration / 1000;
        channelGain.gain.setValueAtTime(0, this.context.currentTime);
        channelGain.gain.linearRampToValueAtTime(
          targetVol,
          this.context.currentTime + fadeDuration
        );
      }

      state.sourceNode = source;
      state.gainNode = channelGain;
      state.currentSrc = src;
    } catch {
      // Emit nothing — caller should listen for errors on the engine
    }
  }

  private stopChannel(channelName: string): void {
    const state = this.channels.get(channelName);
    if (!state || !state.sourceNode) return;

    // Quick fade out (200ms)
    const fadeDuration = 0.2;
    state.gainNode.gain.setValueAtTime(
      state.gainNode.gain.value,
      this.context.currentTime
    );
    state.gainNode.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + fadeDuration
    );

    const source = state.sourceNode;
    setTimeout(() => {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }, 200);

    state.sourceNode = null;
    state.currentSrc = null;
  }

  private pauseChannel(channelName: string): void {
    const state = this.channels.get(channelName);
    if (!state) return;
    // Pause by suspending the context for this channel is not possible individually,
    // so we stop the source and track position (simplified: just stop)
    if (state.sourceNode) {
      try {
        state.sourceNode.stop();
      } catch {
        // already stopped
      }
      state.sourceNode = null;
    }
  }

  // AudioManager interface methods

  play(id: string, options?: { loop?: boolean }): void {
    this.handler({ action: "play", id, loop: options?.loop });
  }

  stop(id: string): void {
    this.handler({ action: "stop", id });
  }

  setVolume(channel: string, volume: number): void {
    const state = this.ensureChannel(channel, this.channelConfigs[channel]);
    state.volume = volume;
    if (!state.muted) {
      state.gainNode.gain.value = volume;
    }
  }

  fade(id: string, toVolume: number, durationMs: number): void {
    const state = this.channels.get(id);
    if (!state) return;
    const fadeSec = durationMs / 1000;
    state.gainNode.gain.setValueAtTime(
      state.gainNode.gain.value,
      this.context.currentTime
    );
    state.gainNode.gain.linearRampToValueAtTime(
      toVolume,
      this.context.currentTime + fadeSec
    );
    state.volume = toVolume;
  }

  registerLayer(id: string, options?: { volume?: number; loop?: boolean }): void {
    this.ensureChannel(id, options);
  }

  mute(channel: string): void {
    const state = this.channels.get(channel);
    if (!state) return;
    state.muted = true;
    state.gainNode.gain.value = 0;
  }

  unmute(channel: string): void {
    const state = this.channels.get(channel);
    if (!state) return;
    state.muted = false;
    state.gainNode.gain.value = state.volume;
  }

  stopAll(): void {
    for (const [name] of this.channels) {
      this.stopChannel(name);
    }
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    // Process queued commands
    const queued = [...this.pendingQueue];
    this.pendingQueue = [];
    for (const cmd of queued) {
      this.processCommand(cmd);
    }
  }

  async preload(urls: string[]): Promise<void> {
    const promises = urls.map(async (src) => {
      const url = this.basePath + src;
      if (this.bufferCache.has(url)) return;
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(url, buffer);
      } catch {
        // silently skip failed preloads
      }
    });
    await Promise.all(promises);
  }

  /** Expose context state for testing */
  get contextState(): AudioContextState {
    return this.context.state;
  }

  /** Expose buffer cache for testing */
  get cache(): AudioBufferCache {
    return this.bufferCache;
  }
}
