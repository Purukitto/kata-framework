export interface AudioManager {
  play(id: string, options?: { loop?: boolean }): void;
  stop(id: string): void;
  setVolume(id: string, volume: number): void;
  fade(id: string, toVolume: number, durationMs: number): void;
  registerLayer(id: string, options?: { volume?: number; loop?: boolean }): void;
}

export class NoopAudioManager implements AudioManager {
  play() {}
  stop() {}
  setVolume() {}
  fade() {}
  registerLayer() {}
}
