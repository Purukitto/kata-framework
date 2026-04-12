export interface AssetPipelineOptions {
  basePath?: string;
  maxConcurrent?: number;
  cacheStrategy?: "memory" | "cache-api" | "none";
  maxCacheSize?: number;
}

export interface PreloadHandle {
  onProgress(cb: (loaded: number, total: number) => void): void;
  complete: Promise<{ errors: Array<{ url: string; error: Error }> }>;
}

/**
 * LRU cache for loaded assets.
 */
export class AssetCache {
  private cache = new Map<string, any>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value as T | undefined;
  }

  set(key: string, value: any): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  evict(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Tracks progress of a batch preload operation.
 */
class ProgressTracker {
  private loaded = 0;
  private total: number;
  private callbacks: Array<(loaded: number, total: number) => void> = [];

  constructor(total: number) {
    this.total = total;
  }

  onProgress(cb: (loaded: number, total: number) => void): void {
    this.callbacks.push(cb);
  }

  increment(): void {
    this.loaded++;
    for (const cb of this.callbacks) {
      cb(this.loaded, this.total);
    }
  }

  getLoaded(): number {
    return this.loaded;
  }
}

/**
 * Determines asset type from file extension.
 */
function getAssetType(url: string): "image" | "audio" | "json" | "unknown" {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "audio";
  if (ext === "json") return "json";
  return "unknown";
}

/**
 * Asset loading pipeline with caching, progress tracking, and concurrency control.
 */
export class AssetPipeline {
  private cache: AssetCache;
  private basePath: string;
  private maxConcurrent: number;
  private inFlight = 0;
  private queue: Array<{ url: string; resolve: (value: any) => void; reject: (err: Error) => void }> = [];

  constructor(options: AssetPipelineOptions = {}) {
    this.basePath = options.basePath ?? "";
    this.maxConcurrent = options.maxConcurrent ?? 4;
    const maxCacheSize = options.maxCacheSize ?? 200;
    this.cache = options.cacheStrategy === "none"
      ? new AssetCache(0)
      : new AssetCache(maxCacheSize);
  }

  /**
   * Preload a set of assets with progress tracking.
   */
  preload(urls: string[]): PreloadHandle {
    const tracker = new ProgressTracker(urls.length);
    const errors: Array<{ url: string; error: Error }> = [];

    const complete = Promise.all(
      urls.map(async (url) => {
        try {
          await this.loadAsset(url);
        } catch (err) {
          errors.push({
            url,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
        tracker.increment();
      })
    ).then(() => ({ errors }));

    return {
      onProgress: (cb) => tracker.onProgress(cb),
      complete,
    };
  }

  /**
   * Get a previously loaded asset.
   */
  get<T>(url: string): T | undefined {
    const fullUrl = this.basePath + url;
    return this.cache.get<T>(fullUrl);
  }

  /**
   * Check if an asset has been loaded and cached.
   */
  isLoaded(url: string): boolean {
    const fullUrl = this.basePath + url;
    return this.cache.has(fullUrl);
  }

  /**
   * Get the full URL for an asset.
   */
  getUrl(url: string): string | undefined {
    const fullUrl = this.basePath + url;
    return this.cache.has(fullUrl) ? fullUrl : undefined;
  }

  /**
   * Clear all cached assets.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict a single asset from cache.
   */
  evict(url: string): void {
    const fullUrl = this.basePath + url;
    this.cache.evict(fullUrl);
  }

  /**
   * Load a single asset, respecting concurrency limits.
   */
  private loadAsset(url: string): Promise<any> {
    const fullUrl = this.basePath + url;

    // Return cached value if available
    if (this.cache.has(fullUrl)) {
      return Promise.resolve(this.cache.get(fullUrl));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ url: fullUrl, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.inFlight++;

      this.fetchAndDecode(item.url)
        .then((result) => {
          this.cache.set(item.url, result);
          item.resolve(result);
        })
        .catch((err) => {
          item.reject(err);
        })
        .finally(() => {
          this.inFlight--;
          this.processQueue();
        });
    }
  }

  private async fetchAndDecode(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${url} (${response.status})`);
    }

    const assetType = getAssetType(url);

    switch (assetType) {
      case "json": {
        return response.json();
      }
      case "audio": {
        return response.arrayBuffer();
      }
      case "image": {
        // In non-browser environments, return the blob
        return response.blob();
      }
      default: {
        return response.arrayBuffer();
      }
    }
  }

  /** Expose internal cache for testing */
  get assetCache(): AssetCache {
    return this.cache;
  }

  /** Expose current in-flight count for testing */
  get inFlightCount(): number {
    return this.inFlight;
  }

  /** Expose queue length for testing */
  get queueLength(): number {
    return this.queue.length;
  }
}
