import { parseKata, KataEngine } from "@kata-framework/core";
import type { KSONFrame } from "@kata-framework/core";

export function createTestEngine(
  input: string | string[],
  initialCtx: Record<string, any> = {}
): { engine: KataEngine; frames: KSONFrame[] } {
  const engine = new KataEngine(initialCtx);
  const frames: KSONFrame[] = [];

  engine.on("update", (frame: KSONFrame) => {
    frames.push(frame);
  });

  const inputs = Array.isArray(input) ? input : [input];
  for (const raw of inputs) {
    const scene = parseKata(raw);
    engine.registerScene(scene);
  }

  return { engine, frames };
}
