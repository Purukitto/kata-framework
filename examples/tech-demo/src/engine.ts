import {
  parseKata,
  KataEngine,
  parseLocaleYaml,
  AssetRegistry,
  SceneGraph,
  mergeScene,
  type KSONScene,
  type GameStateSnapshot,
  type ScenePatch,
} from "@kata-framework/core";
import { analyticsPlugin } from "@kata-framework/core/plugins/analytics";
import { profanityPlugin } from "@kata-framework/core/plugins/profanity";
import { autoSavePlugin } from "@kata-framework/core/plugins/auto-save";
import { loggerPlugin } from "@kata-framework/core/plugins/logger";
import { contentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";
import { listenerCountPlugin } from "./plugins/listener-count";
import type { AnalyticsPlugin } from "@kata-framework/core/plugins/analytics";
import type { LoggerPlugin, LogEntry } from "@kata-framework/core/plugins/logger";
import type { ContentWarningsPlugin } from "@kata-framework/core/plugins/content-warnings";
import type { ListenerCountPlugin } from "./plugins/listener-count";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

function findFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

export function loadScenes(scenesDir: string): KSONScene[] {
  const files = findFiles(scenesDir, ".kata");
  return files.map((file) => {
    const source = readFileSync(file, "utf-8");
    return parseKata(source);
  });
}

export interface ModManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  scenes: string[];
  patches: Array<{ target: string; file: string }>;
}

export interface ContentWarningEvent {
  sceneId: string;
  tags: string[];
}

export interface EnginePlugins {
  analytics: AnalyticsPlugin;
  logger: LoggerPlugin;
  contentWarnings: ContentWarningsPlugin;
  listenerCount: ListenerCountPlugin;
}

/**
 * Loads locale files from the locales directory and registers them with the engine.
 * File structure: locales/<lang>/<sceneId>.yaml
 */
export function loadAndRegisterLocales(engine: KataEngine, localesDir: string): string[] {
  const registeredLocales: string[] = [];
  if (!existsSync(localesDir)) return registeredLocales;

  for (const lang of readdirSync(localesDir)) {
    const langDir = join(localesDir, lang);
    if (!statSync(langDir).isDirectory()) continue;

    const yamlFiles = findFiles(langDir, ".yaml");
    for (const file of yamlFiles) {
      const content = readFileSync(file, "utf-8");
      const data = parseLocaleYaml(content);
      // Scene ID is the filename without extension
      const fileName = file.split(/[/\\]/).pop()!.replace(".yaml", "");
      engine.registerLocale(fileName, data.locale, data.overrides);
    }
    if (!registeredLocales.includes(lang)) {
      registeredLocales.push(lang);
    }
  }
  return registeredLocales;
}

/**
 * Loads a mod manifest and applies it: registers new scenes, applies patches.
 */
export function loadMod(
  modDir: string,
  scenes: KSONScene[],
): { manifest: ModManifest; newScenes: KSONScene[]; patchedScenes: Map<string, KSONScene> } {
  const manifestPath = join(modDir, "manifest.json");
  const manifest: ModManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const newScenes: KSONScene[] = [];
  for (const scenePath of manifest.scenes) {
    const source = readFileSync(join(modDir, scenePath), "utf-8");
    newScenes.push(parseKata(source));
  }

  const patchedScenes = new Map<string, KSONScene>();
  for (const patch of manifest.patches) {
    const patchData: ScenePatch = JSON.parse(readFileSync(join(modDir, patch.file), "utf-8"));
    const baseScene = scenes.find((s) => s.meta.id === patch.target);
    if (baseScene) {
      patchedScenes.set(patch.target, mergeScene(baseScene, patchData));
    }
  }

  return { manifest, newScenes, patchedScenes };
}

/**
 * Builds an AssetRegistry and SceneGraph from the registered scenes.
 */
export function buildAssetGraph(scenes: KSONScene[]): { registry: AssetRegistry; graph: SceneGraph } {
  const registry = new AssetRegistry();
  const graph = new SceneGraph();

  for (const scene of scenes) {
    registry.registerFromScene(scene);
  }
  graph.buildFromScenes(scenes);

  return { registry, graph };
}

export function createDemoEngine(scenes: KSONScene[]): {
  engine: KataEngine;
  plugins: EnginePlugins;
  logEntries: LogEntry[];
  contentWarningEvents: ContentWarningEvent[];
  autoSaveSnapshots: Map<number, GameStateSnapshot>;
  assetRegistry: AssetRegistry;
  sceneGraph: SceneGraph;
} {
  const logEntries: LogEntry[] = [];
  const contentWarningEvents: ContentWarningEvent[] = [];
  const autoSaveSnapshots = new Map<number, GameStateSnapshot>();

  const analytics = analyticsPlugin();

  const profanity = profanityPlugin({
    words: ["damn", "hell", "crap", "bastard"],
    replacement: "[BLEEP]",
    scope: "all",
  });

  const autoSave = autoSavePlugin({
    interval: "choice",
    maxSlots: 5,
    onSave: (snapshot, slotIndex) => {
      autoSaveSnapshots.set(slotIndex, snapshot);
    },
  });

  const logger = loggerPlugin({
    level: "verbose",
    output: (entry) => {
      logEntries.push(entry);
    },
  });

  const contentWarnings = contentWarningsPlugin({
    warnings: {
      expose: ["distressing content", "political violence"],
    },
    onWarn: (sceneId, tags) => {
      contentWarningEvents.push({ sceneId, tags });
    },
  });

  const listenerCount = listenerCountPlugin({
    baseGrowth: 50,
    riskMultiplier: 2.0,
    idleDecay: 10,
  });

  const engine = new KataEngine();

  // Register plugins
  engine.use(analytics);
  engine.use(profanity);
  engine.use(autoSave);
  engine.use(logger);
  engine.use(contentWarnings);
  engine.use(listenerCount);

  // Register all scenes
  for (const scene of scenes) {
    engine.registerScene(scene);
  }

  // Build asset registry and scene graph
  const { registry: assetRegistry, graph: sceneGraph } = buildAssetGraph(scenes);

  return {
    engine,
    plugins: { analytics, logger, contentWarnings, listenerCount },
    logEntries,
    contentWarningEvents,
    autoSaveSnapshots,
    assetRegistry,
    sceneGraph,
  };
}
