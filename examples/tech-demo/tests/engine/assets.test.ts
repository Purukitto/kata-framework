import { describe, test, expect } from "bun:test";
import { parseKata, AssetRegistry, SceneGraph } from "@kata-framework/core";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function findKataFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findKataFiles(full));
    } else if (entry.endsWith(".kata")) {
      results.push(full);
    }
  }
  return results;
}

function loadAllScenes() {
  return findKataFiles(scenesDir).map((f) => parseKata(readFileSync(f, "utf-8")));
}

describe("asset registry", () => {
  test("registers assets from all scenes", () => {
    const scenes = loadAllScenes();
    const registry = new AssetRegistry();

    for (const scene of scenes) {
      registry.registerFromScene(scene);
    }

    const allAssets = registry.getAllAssetIds();
    // Scenes with [bg] directives register their src as assets
    expect(allAssets.length).toBeGreaterThan(0);
    expect(allAssets).toContain("static-overlay.png");
    expect(allAssets).toContain("studio-night.jpg");
  });

  test("tracks assets per scene", () => {
    const scenes = loadAllScenes();
    const registry = new AssetRegistry();

    for (const scene of scenes) {
      registry.registerFromScene(scene);
    }

    // Prologue has a [bg] directive
    const prologueAssets = registry.getAssetsForScene("prologue");
    expect(prologueAssets).toContain("static-overlay.png");

    // Booth has a [bg] directive
    const boothAssets = registry.getAssetsForScene("booth");
    expect(boothAssets).toContain("studio-night.jpg");
  });

  test("getAssetsForScenes aggregates multiple scenes", () => {
    const scenes = loadAllScenes();
    const registry = new AssetRegistry();

    for (const scene of scenes) {
      registry.registerFromScene(scene);
    }

    const combined = registry.getAssetsForScenes(["prologue", "booth"]);
    expect(combined).toContain("static-overlay.png");
    expect(combined).toContain("studio-night.jpg");
  });
});

describe("scene graph", () => {
  test("builds graph from all demo scenes", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const allIds = graph.getAllSceneIds();
    expect(allIds).toContain("prologue");
    expect(allIds).toContain("booth");
    expect(allIds).toContain("shutdown");
    expect(allIds).toContain("liberation");
  });

  test("prologue connects to booth", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const reachable = graph.getReachable("prologue", 1);
    expect(reachable).toContain("booth");
  });

  test("endings are dead ends", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const deadEnds = graph.getDeadEnds();
    expect(deadEnds).toContain("shutdown");
    expect(deadEnds).toContain("liberation");
    expect(deadEnds).toContain("underground");
  });

  test("all scenes reachable from prologue (no orphans)", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const orphans = graph.getOrphans("prologue");
    // All demo scenes should be reachable from prologue
    // (caller_hale, caller_maria, caller_vex are reached via first_broadcast)
    expect(orphans.length).toBe(0);
  });

  test("getPreloadSet returns assets for reachable scenes", () => {
    const scenes = loadAllScenes();
    const registry = new AssetRegistry();
    const graph = new SceneGraph();

    for (const scene of scenes) {
      registry.registerFromScene(scene);
    }
    graph.buildFromScenes(scenes);

    const preloadSet = graph.getPreloadSet("prologue", registry, 1);
    // Should include prologue's own assets + booth's assets (1 hop)
    expect(preloadSet).toContain("static-overlay.png");
    expect(preloadSet).toContain("studio-night.jpg");
  });

  test("toJSON produces valid structure", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const json = graph.toJSON();
    expect(json.nodes.length).toBeGreaterThan(0);
    expect(json.edges.length).toBeGreaterThan(0);
    expect(json.nodes[0]).toHaveProperty("id");
    expect(json.edges[0]).toHaveProperty("from");
    expect(json.edges[0]).toHaveProperty("to");
  });

  test("toDOT produces valid Graphviz output", () => {
    const scenes = loadAllScenes();
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const dot = graph.toDOT();
    expect(dot).toContain("digraph {");
    expect(dot).toContain('"prologue"');
    expect(dot).toContain('"prologue" -> "booth"');
  });
});
