import type { GameStateSnapshot } from "@kata-framework/core";

/**
 * Abstract storage backend for SaveManager.
 * Implement this interface for custom backends (IndexedDB, cloud, etc.).
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Metadata for a single save slot. */
export interface SaveSlot {
  index: number;
  isEmpty: boolean;
  sceneName: string | null;
  timestamp: number | null;
  isAutoSave: boolean;
}

export interface SaveManagerOptions {
  /** Storage backend — "localStorage" string or a custom StorageAdapter. Default: "localStorage" */
  storage?: "localStorage" | StorageAdapter;
  /** Key prefix for storage entries. Default: "kata-save" */
  prefix?: string;
  /** Maximum number of save slots. Default: 10 */
  maxSlots?: number;
  /** Slot index reserved for auto-save. Default: undefined (no auto-save slot) */
  autoSaveSlot?: number;
}

interface SlotMeta {
  sceneName: string | null;
  timestamp: number;
}

/** Built-in localStorage wrapper. */
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

/**
 * Manages save/load slots backed by a pluggable StorageAdapter.
 */
export class SaveManager {
  private adapter: StorageAdapter;
  private prefix: string;
  private _maxSlots: number;
  private _autoSaveSlot: number | undefined;

  constructor(options: SaveManagerOptions = {}) {
    if (!options.storage || options.storage === "localStorage") {
      this.adapter = new LocalStorageAdapter();
    } else {
      this.adapter = options.storage;
    }
    this.prefix = options.prefix ?? "kata-save";
    this._maxSlots = options.maxSlots ?? 10;
    this._autoSaveSlot = options.autoSaveSlot;
  }

  get maxSlots(): number {
    return this._maxSlots;
  }

  get autoSaveSlot(): number | undefined {
    return this._autoSaveSlot;
  }

  private dataKey(index: number): string {
    return `${this.prefix}-slot-${index}`;
  }

  private metaKey(index: number): string {
    return `${this.prefix}-meta-${index}`;
  }

  private validateIndex(index: number): void {
    if (index < 0 || index >= this._maxSlots) {
      throw new RangeError(
        `Save slot index ${index} out of range (0..${this._maxSlots - 1})`
      );
    }
  }

  /** Save a snapshot to a slot. */
  save(index: number, snapshot: GameStateSnapshot): void {
    this.validateIndex(index);
    const meta: SlotMeta = {
      sceneName: snapshot.currentSceneId,
      timestamp: Date.now(),
    };
    this.adapter.setItem(this.dataKey(index), JSON.stringify(snapshot));
    this.adapter.setItem(this.metaKey(index), JSON.stringify(meta));
  }

  /** Load a snapshot from a slot. Returns null if empty or corrupted. */
  load(index: number): GameStateSnapshot | null {
    this.validateIndex(index);
    const raw = this.adapter.getItem(this.dataKey(index));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameStateSnapshot;
    } catch {
      return null;
    }
  }

  /** Remove a save slot. */
  remove(index: number): void {
    this.validateIndex(index);
    this.adapter.removeItem(this.dataKey(index));
    this.adapter.removeItem(this.metaKey(index));
  }

  /** Get metadata for a single slot. */
  getSlotMeta(index: number): SaveSlot {
    this.validateIndex(index);
    const raw = this.adapter.getItem(this.metaKey(index));
    if (!raw) {
      return {
        index,
        isEmpty: true,
        sceneName: null,
        timestamp: null,
        isAutoSave: index === this._autoSaveSlot,
      };
    }
    try {
      const meta = JSON.parse(raw) as SlotMeta;
      return {
        index,
        isEmpty: false,
        sceneName: meta.sceneName,
        timestamp: meta.timestamp,
        isAutoSave: index === this._autoSaveSlot,
      };
    } catch {
      return {
        index,
        isEmpty: true,
        sceneName: null,
        timestamp: null,
        isAutoSave: index === this._autoSaveSlot,
      };
    }
  }

  /** Get metadata for all slots. */
  getSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];
    for (let i = 0; i < this._maxSlots; i++) {
      slots.push(this.getSlotMeta(i));
    }
    return slots;
  }
}
