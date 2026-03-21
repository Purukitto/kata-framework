import type { KataEngine, KSONFrame } from "@kata-framework/core";

export interface CollectFramesOptions {
  autoPick?: string | ((choices: Array<{ id: string; label: string }>) => string);
  maxFrames?: number;
}

export function collectFrames(
  engine: KataEngine,
  sceneId: string,
  options: CollectFramesOptions = {}
): KSONFrame[] {
  const { autoPick, maxFrames = 1000 } = options;
  const frames: KSONFrame[] = [];
  let ended = false;

  engine.on("update", (frame: KSONFrame) => {
    frames.push(frame);
  });

  engine.on("end", () => {
    ended = true;
  });

  engine.start(sceneId);

  let safety = 0;
  while (!ended && safety < maxFrames) {
    const lastFrame = frames[frames.length - 1];
    if (!lastFrame) break;

    if (lastFrame.action.type === "choice") {
      if (!autoPick) break; // stop at choice if no autoPick

      const choices = lastFrame.action.choices;
      const pickId =
        typeof autoPick === "string"
          ? autoPick
          : autoPick(choices);

      engine.makeChoice(pickId);
    } else {
      engine.next();
    }
    safety++;
  }

  return frames;
}
