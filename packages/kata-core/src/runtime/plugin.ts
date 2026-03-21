import type { KSONAction, Choice } from "../types";

export interface KataPlugin {
  name: string;
  beforeAction?(action: KSONAction, ctx: Record<string, any>): KSONAction | null;
  afterAction?(action: KSONAction, ctx: Record<string, any>): void;
  onChoice?(choice: Choice, ctx: Record<string, any>): void;
  beforeSceneChange?(fromId: string | null, toId: string, ctx: Record<string, any>): void;
}

export class PluginManager {
  private plugins: KataPlugin[] = [];

  register(plugin: KataPlugin): void {
    if (this.plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.plugins.push(plugin);
  }

  remove(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  getNames(): string[] {
    return this.plugins.map((p) => p.name);
  }

  runBeforeAction(action: KSONAction, ctx: Record<string, any>): KSONAction | null {
    let current: KSONAction | null = action;
    for (const plugin of this.plugins) {
      if (!current) return null;
      if (plugin.beforeAction) {
        current = plugin.beforeAction(current, ctx);
      }
    }
    return current;
  }

  runAfterAction(action: KSONAction, ctx: Record<string, any>): void {
    for (const plugin of this.plugins) {
      plugin.afterAction?.(action, ctx);
    }
  }

  runOnChoice(choice: Choice, ctx: Record<string, any>): void {
    for (const plugin of this.plugins) {
      plugin.onChoice?.(choice, ctx);
    }
  }

  runBeforeSceneChange(fromId: string | null, toId: string, ctx: Record<string, any>): void {
    for (const plugin of this.plugins) {
      plugin.beforeSceneChange?.(fromId, toId, ctx);
    }
  }

  get hasPlugins(): boolean {
    return this.plugins.length > 0;
  }
}
