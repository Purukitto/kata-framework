import type { KSONScene } from "../types";

export class AssetRegistry {
  private assets = new Map<string, string>();
  private sceneAssets = new Map<string, string[]>();

  register(id: string, url: string): void {
    this.assets.set(id, url);
  }

  registerFromScene(scene: KSONScene): void {
    const ids: string[] = [];

    // Extract from meta.assets
    if (scene.meta.assets) {
      for (const [id, url] of Object.entries(scene.meta.assets)) {
        this.assets.set(id, url);
        ids.push(id);
      }
    }

    // Extract src from visual actions
    for (const action of scene.actions) {
      if (action.type === "visual") {
        this.assets.set(action.src, action.src);
        ids.push(action.src);
      }
    }

    this.sceneAssets.set(scene.meta.id, ids);
  }

  getUrl(id: string): string | undefined {
    return this.assets.get(id);
  }

  getAssetsForScene(sceneId: string): string[] {
    return this.sceneAssets.get(sceneId) ?? [];
  }

  getAssetsForScenes(sceneIds: string[]): string[] {
    const seen = new Set<string>();
    for (const id of sceneIds) {
      for (const assetId of this.getAssetsForScene(id)) {
        seen.add(assetId);
      }
    }
    return [...seen];
  }

  getAllAssetIds(): string[] {
    return [...this.assets.keys()];
  }
}

export interface AssetLoader {
  preload(ids: string[]): Promise<void>;
  isLoaded(id: string): boolean;
  getUrl(id: string): string | undefined;
}
