export interface VFSProvider {
  readFile(path: string): Promise<string | null>;
  listDir(path: string): Promise<string[]>;
}

export class LayeredVFS {
  private layers: Array<{ name: string; provider: VFSProvider }> = [];

  addLayer(name: string, provider: VFSProvider): void {
    this.layers.unshift({ name, provider });
  }

  removeLayer(name: string): void {
    this.layers = this.layers.filter((l) => l.name !== name);
  }

  getLayers(): string[] {
    return this.layers.map((l) => l.name);
  }

  async readFile(path: string): Promise<string | null> {
    for (const layer of this.layers) {
      const result = await layer.provider.readFile(path);
      if (result !== null) {
        return result;
      }
    }
    return null;
  }

  async listDir(path: string): Promise<string[]> {
    const seen = new Set<string>();
    for (const layer of this.layers) {
      const entries = await layer.provider.listDir(path);
      for (const entry of entries) {
        seen.add(entry);
      }
    }
    return [...seen].sort();
  }
}
