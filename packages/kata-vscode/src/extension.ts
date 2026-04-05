import * as path from "node:path";
import type { ExtensionContext } from "vscode";

let client: any;

export async function activate(context: ExtensionContext) {
  // Dynamically import VS Code modules (only available at runtime in VS Code)
  const vscode = await import("vscode");
  const { LanguageClient, TransportKind } = await import("vscode-languageclient/node.js");

  // Resolve the LSP server module
  const serverModule = context.asAbsolutePath(
    path.join("node_modules", "@kata-framework", "lsp", "dist", "server.js")
  );

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions = {
    documentSelector: [{ scheme: "file", language: "kata" }],
  };

  client = new LanguageClient(
    "kataLanguageServer",
    "Kata Language Server",
    serverOptions,
    clientOptions
  );

  await client.start();

  // Register scene graph command
  const graphCommand = vscode.commands.registerCommand(
    "kata.showSceneGraph",
    async () => {
      const panel = vscode.window.createWebviewPanel(
        "kataSceneGraph",
        "Kata: Scene Graph",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      await updateGraphPanel(panel, vscode);

      // Watch for .kata file changes
      const watcher = vscode.workspace.createFileSystemWatcher("**/*.kata");
      watcher.onDidChange(() => updateGraphPanel(panel, vscode));
      watcher.onDidCreate(() => updateGraphPanel(panel, vscode));
      watcher.onDidDelete(() => updateGraphPanel(panel, vscode));

      panel.onDidDispose(() => watcher.dispose());
    }
  );

  context.subscriptions.push(graphCommand);
}

export function deactivate(): Promise<void> | undefined {
  if (client) {
    return client.stop();
  }
  return undefined;
}

async function updateGraphPanel(panel: any, vscode: any) {
  try {
    const { parseKata, SceneGraph } = await import("@kata-framework/core");

    const files = await vscode.workspace.findFiles("**/*.kata");
    const scenes = [];

    for (const file of files) {
      const doc = await vscode.workspace.openTextDocument(file);
      try {
        const scene = parseKata(doc.getText());
        scenes.push(scene);
      } catch {
        // Skip unparseable files
      }
    }

    const graph = new SceneGraph();
    graph.buildFromScenes(scenes);
    const json = graph.toJSON();
    const startId = scenes[0]?.meta.id;
    const orphans = startId ? graph.getOrphans(startId) : [];
    const deadEnds = graph.getDeadEnds();

    panel.webview.html = getGraphHtml(json, orphans, deadEnds);
  } catch {
    panel.webview.html = "<html><body><p>Error loading scene graph.</p></body></html>";
  }
}

function getGraphHtml(
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> },
  orphans: string[],
  deadEnds: string[]
): string {
  const orphanSet = JSON.stringify(orphans);
  const deadEndSet = JSON.stringify(deadEnds);
  const data = JSON.stringify(graphData);

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #1e1e1e; color: #ccc; font-family: sans-serif; overflow: hidden; }
    svg { width: 100vw; height: 100vh; }
    .node circle { r: 20; stroke: #555; stroke-width: 2; cursor: pointer; }
    .node text { font-size: 11px; fill: #ccc; text-anchor: middle; dy: 30; }
    .node.reachable circle { fill: #2d7d46; }
    .node.orphan circle { fill: #c49d1a; }
    .node.deadend circle { fill: #c44b4b; }
    .edge line { stroke: #555; stroke-width: 1.5; marker-end: url(#arrow); }
    .legend { position: fixed; top: 10px; right: 10px; background: #2a2a2a; padding: 10px; border-radius: 6px; font-size: 12px; }
    .legend div { margin: 4px 0; }
    .legend span { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="legend">
    <div><span style="background:#2d7d46"></span>Reachable</div>
    <div><span style="background:#c49d1a"></span>Orphaned</div>
    <div><span style="background:#c44b4b"></span>Dead End</div>
  </div>
  <svg>
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#555"/>
      </marker>
    </defs>
  </svg>
  <script>
    const graph = ${data};
    const orphans = new Set(${orphanSet});
    const deadEnds = new Set(${deadEndSet});
    const svg = document.querySelector('svg');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Simple force-directed layout
    const nodes = graph.nodes.map((n, i) => ({
      ...n,
      x: width/2 + (Math.random() - 0.5) * 300,
      y: height/2 + (Math.random() - 0.5) * 300,
      vx: 0, vy: 0
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Create SVG elements
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(edgeGroup);
    svg.appendChild(nodeGroup);

    const edgeElements = graph.edges.map(e => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('edge');
      edgeGroup.appendChild(line);
      return { el: line, from: e.from, to: e.to };
    });

    const nodeElements = nodes.map(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('node');
      if (orphans.has(n.id)) g.classList.add('orphan');
      else if (deadEnds.has(n.id)) g.classList.add('deadend');
      else g.classList.add('reachable');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = n.id;
      g.appendChild(circle);
      g.appendChild(text);
      nodeGroup.appendChild(g);
      return { el: g, node: n };
    });

    // Simple simulation
    function tick() {
      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
          const force = 5000 / (dist * dist);
          nodes[i].vx -= dx/dist * force;
          nodes[i].vy -= dy/dist * force;
          nodes[j].vx += dx/dist * force;
          nodes[j].vy += dy/dist * force;
        }
      }

      // Attraction along edges
      for (const e of graph.edges) {
        const s = nodeMap.get(e.from);
        const t = nodeMap.get(e.to);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const force = (dist - 150) * 0.01;
        s.vx += dx/dist * force;
        s.vy += dy/dist * force;
        t.vx -= dx/dist * force;
        t.vy -= dy/dist * force;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx += (width/2 - n.x) * 0.001;
        n.vy += (height/2 - n.y) * 0.001;
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx;
        n.y += n.vy;
      }

      // Update DOM
      for (const ne of nodeElements) {
        ne.el.setAttribute('transform', 'translate('+ne.node.x+','+ne.node.y+')');
      }
      for (const ee of edgeElements) {
        const s = nodeMap.get(ee.from);
        const t = nodeMap.get(ee.to);
        if (s && t) {
          ee.el.setAttribute('x1', s.x);
          ee.el.setAttribute('y1', s.y);
          ee.el.setAttribute('x2', t.x);
          ee.el.setAttribute('y2', t.y);
        }
      }

      requestAnimationFrame(tick);
    }
    tick();
  </script>
</body>
</html>`;
}
