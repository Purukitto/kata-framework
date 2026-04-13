import { KataEngine, parseKataWithDiagnostics, type KSONScene, type Diagnostic } from "@kata-framework/core";

export interface IsolatedEngineResult {
  engine: KataEngine | null;
  scene: KSONScene | null;
  diagnostics: Diagnostic[];
  fatalError: string | null;
}

export function createIsolatedEngine(source: string): IsolatedEngineResult {
  let scene: KSONScene | null = null;
  let diagnostics: Diagnostic[] = [];
  try {
    const parsed = parseKataWithDiagnostics(source);
    scene = parsed.scene;
    diagnostics = parsed.diagnostics;
  } catch (err) {
    return {
      engine: null,
      scene: null,
      diagnostics: [],
      fatalError: err instanceof Error ? err.message : String(err),
    };
  }

  const fatal = diagnostics.find((d) => d.level === "error");
  if (fatal || !scene || !scene.meta.id || scene.meta.id === "unknown") {
    return {
      engine: null,
      scene,
      diagnostics,
      fatalError: fatal?.message ?? "Invalid scene",
    };
  }

  const engine = new KataEngine({}, { onMissingScene: "error-event" });
  engine.registerScene(scene);

  return { engine, scene, diagnostics, fatalError: null };
}
