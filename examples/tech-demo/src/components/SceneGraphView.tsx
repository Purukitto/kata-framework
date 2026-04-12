interface SceneGraphViewProps {
  graph: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> };
  currentSceneId?: string;
  onClose: () => void;
}

export function SceneGraphView({ graph, currentSceneId, onClose }: SceneGraphViewProps) {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  return (
    <div className="scene-graph" role="dialog" aria-label="Scene Graph">
      <div className="scene-graph__header">
        <h3 className="scene-graph__title">Scene Graph</h3>
        <span className="scene-graph__stats">{nodeCount} scenes, {edgeCount} connections</span>
        <button className="scene-graph__close" onClick={onClose} aria-label="Close scene graph">×</button>
      </div>
      <div className="scene-graph__body">
        <div className="scene-graph__nodes">
          {graph.nodes.map((node) => (
            <div
              key={node.id}
              className={`scene-graph__node ${node.id === currentSceneId ? "scene-graph__node--active" : ""}`}
            >
              <span className="scene-graph__node-id">{node.id}</span>
              <div className="scene-graph__edges">
                {graph.edges
                  .filter((e) => e.from === node.id)
                  .map((e, i) => (
                    <span key={i} className="scene-graph__edge-target">→ {e.to}</span>
                  ))}
                {graph.edges.filter((e) => e.from === node.id).length === 0 && (
                  <span className="scene-graph__edge-dead">dead end</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
