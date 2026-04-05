import { parseKata, SceneGraph } from "@kata-framework/core";
import { basename } from "node:path";
import type { KSONScene } from "@kata-framework/core";

export type GraphFormat = "dot" | "json";

export async function graph(
  globPattern: string,
  options: { format: GraphFormat; lint: boolean }
): Promise<void> {
  const glob = new Bun.Glob(globPattern);
  const files = Array.from(
    glob.scanSync({ cwd: process.cwd(), absolute: true })
  );

  if (files.length === 0) {
    console.log("No .kata files matched the pattern.");
    return;
  }

  const scenes: KSONScene[] = [];

  for (const filePath of files) {
    try {
      const content = await Bun.file(filePath).text();
      const scene = parseKata(content);
      scenes.push(scene);
    } catch (err) {
      console.error(
        `  ✗ ${basename(filePath)}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const sceneGraph = new SceneGraph();
  sceneGraph.buildFromScenes(scenes);

  if (options.lint) {
    const startId = scenes[0]?.meta.id;
    if (!startId) {
      console.error("No scenes found.");
      return;
    }

    const orphans = sceneGraph.getOrphans(startId);
    const deadEnds = sceneGraph.getDeadEnds();

    for (const id of orphans) {
      console.warn(`⚠ Orphaned scene: "${id}" (no inbound edges)`);
    }
    for (const id of deadEnds) {
      console.warn(
        `⚠ Dead end: "${id}" (no choices, no outbound edges)`
      );
    }

    if (orphans.length === 0 && deadEnds.length === 0) {
      console.log("No issues found.");
    }
    return;
  }

  if (options.format === "dot") {
    console.log(sceneGraph.toDOT());
  } else {
    console.log(JSON.stringify(sceneGraph.toJSON(), null, 2));
  }
}
