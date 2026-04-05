import { expect, test, describe } from "bun:test";
import { SceneGraph } from "../src/assets/sceneGraph";
import type { KSONScene } from "../src/types";

const scenes: KSONScene[] = [
  {
    meta: { id: "start" },
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
    meta: { id: "scene-a" },
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
    meta: { id: "scene-c" },
    script: "",
    actions: [{ type: "text", speaker: "N", content: "The end" }],
  },
  {
    meta: { id: "secret-ending" },
    script: "",
    actions: [{ type: "text", speaker: "N", content: "Secret!" }],
  },
];

describe("SceneGraph Analysis", () => {
  test("getOrphans returns scenes not reachable from start", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const orphans = graph.getOrphans("start");
    expect(orphans).toEqual(["secret-ending"]);
  });

  test("getDeadEnds returns scenes with no outbound edges", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const deadEnds = graph.getDeadEnds();
    expect(deadEnds).toContain("scene-b");
    expect(deadEnds).toContain("scene-c");
    expect(deadEnds).toContain("secret-ending");
    expect(deadEnds).not.toContain("start");
    expect(deadEnds).not.toContain("scene-a");
  });

  test("toJSON returns serializable representation", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const json = graph.toJSON();

    expect(json.nodes).toHaveLength(5);
    expect(json.nodes.map((n) => n.id)).toContain("start");
    expect(json.nodes.map((n) => n.id)).toContain("secret-ending");

    expect(json.edges).toContainEqual({ from: "start", to: "scene-a" });
    expect(json.edges).toContainEqual({ from: "start", to: "scene-b" });
    expect(json.edges).toContainEqual({ from: "scene-a", to: "scene-c" });
    expect(json.edges).toHaveLength(3);
  });

  test("toDOT returns valid DOT syntax", () => {
    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const dot = graph.toDOT();

    expect(dot).toStartWith("digraph {");
    expect(dot).toEndWith("}");
    expect(dot).toContain('"start" -> "scene-a"');
    expect(dot).toContain('"start" -> "scene-b"');
    expect(dot).toContain('"scene-a" -> "scene-c"');
    expect(dot).toContain('"secret-ending"');
  });

  test("handles cycles in getOrphans without infinite loop", () => {
    const cyclicScenes: KSONScene[] = [
      {
        meta: { id: "a" },
        script: "",
        actions: [
          { type: "choice", choices: [{ id: "1", label: "Go", target: "b" }] },
        ],
      },
      {
        meta: { id: "b" },
        script: "",
        actions: [
          { type: "choice", choices: [{ id: "2", label: "Back", target: "a" }] },
        ],
      },
      {
        meta: { id: "orphan" },
        script: "",
        actions: [{ type: "text", speaker: "N", content: "Alone" }],
      },
    ];
    const graph = new SceneGraph();
    graph.buildFromScenes(cyclicScenes);

    expect(graph.getOrphans("a")).toEqual(["orphan"]);
    expect(graph.getDeadEnds()).toEqual(["orphan"]);
  });

  test("extracts targets from condition branches (elseIf/else)", () => {
    const condScenes: KSONScene[] = [
      {
        meta: { id: "start" },
        script: "",
        actions: [
          {
            type: "condition",
            condition: "x > 5",
            then: [
              {
                type: "choice",
                choices: [{ id: "c1", label: "A", target: "scene-a" }],
              },
            ],
            elseIf: [
              {
                condition: "x > 2",
                then: [
                  {
                    type: "choice",
                    choices: [{ id: "c2", label: "B", target: "scene-b" }],
                  },
                ],
              },
            ],
            else: [
              {
                type: "choice",
                choices: [{ id: "c3", label: "C", target: "scene-c" }],
              },
            ],
          },
        ],
      },
      { meta: { id: "scene-a" }, script: "", actions: [] },
      { meta: { id: "scene-b" }, script: "", actions: [] },
      { meta: { id: "scene-c" }, script: "", actions: [] },
    ];
    const graph = new SceneGraph();
    graph.buildFromScenes(condScenes);
    const reachable = graph.getReachable("start", 1);
    expect(reachable).toContain("scene-a");
    expect(reachable).toContain("scene-b");
    expect(reachable).toContain("scene-c");
  });
});
