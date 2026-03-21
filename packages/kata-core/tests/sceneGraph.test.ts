import { expect, test, describe } from "bun:test";
import { SceneGraph } from "../src/assets/sceneGraph";
import { AssetRegistry } from "../src/assets/index";
import type { KSONScene } from "../src/types";

const scenes: KSONScene[] = [
  {
    meta: { id: "start", assets: { bg: "start-bg.png" } },
    script: "",
    actions: [
      {
        type: "choice",
        choices: [
          { id: "go-a", label: "Go A", target: "scene-a" },
          { id: "go-b", label: "Go B", target: "scene-b" },
        ],
      },
    ],
  },
  {
    meta: { id: "scene-a", assets: { bg: "a-bg.png" } },
    script: "",
    actions: [
      {
        type: "choice",
        choices: [{ id: "go-c", label: "Go C", target: "scene-c" }],
      },
    ],
  },
  {
    meta: { id: "scene-b" },
    script: "",
    actions: [{ type: "text", speaker: "N", content: "Dead end" }],
  },
  {
    meta: { id: "scene-c", assets: { bg: "c-bg.png" } },
    script: "",
    actions: [{ type: "text", speaker: "N", content: "The end" }],
  },
];

describe("SceneGraph", () => {
  test("buildFromScenes extracts edges from choice targets", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const reachable = graph.getReachable("start", 1);
    expect(reachable).toContain("start");
    expect(reachable).toContain("scene-a");
    expect(reachable).toContain("scene-b");
    expect(reachable).not.toContain("scene-c");
  });

  test("getReachable depth=0 returns only current scene", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    expect(graph.getReachable("start", 0)).toEqual(["start"]);
  });

  test("getReachable depth=1 returns direct neighbors", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const result = graph.getReachable("start", 1);
    expect(result).toHaveLength(3);
    expect(result).toContain("scene-a");
    expect(result).toContain("scene-b");
  });

  test("getReachable depth=2 returns two-hop neighbors", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const result = graph.getReachable("start", 2);
    expect(result).toContain("scene-c");
    expect(result).toHaveLength(4);
  });

  test("handles cycles without infinite loop", () => {
    const cyclicScenes: KSONScene[] = [
      {
        meta: { id: "a" },
        script: "",
        actions: [{ type: "choice", choices: [{ id: "1", label: "Go", target: "b" }] }],
      },
      {
        meta: { id: "b" },
        script: "",
        actions: [{ type: "choice", choices: [{ id: "2", label: "Back", target: "a" }] }],
      },
    ];
    const graph = new SceneGraph();
    graph.buildFromScenes(cyclicScenes);
    const result = graph.getReachable("a", 10);
    expect(result).toEqual(expect.arrayContaining(["a", "b"]));
    expect(result).toHaveLength(2);
  });

  test("getPreloadSet returns deduplicated assets for current + reachable scenes", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);

    const registry = new AssetRegistry();
    for (const s of scenes) registry.registerFromScene(s);

    const assets = graph.getPreloadSet("start", registry, 1);
    expect(assets).toContain("bg");
    expect(assets.filter((x) => x === "bg").length).toBe(1); // deduplicated
  });
});
