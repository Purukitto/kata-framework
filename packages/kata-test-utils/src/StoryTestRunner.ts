import { KataEngine, parseKata, SceneGraph } from "@kata-framework/core";
import type { KSONFrame, KSONScene, Choice } from "@kata-framework/core";

export interface StoryTestRunnerOptions {
  /** Maximum number of advance steps before throwing. Defaults to 1000. */
  maxSteps?: number;
}

/**
 * High-level test harness for narrative behavior. Wraps a KataEngine and
 * exposes intent-based assertions ("advance until choice", "choose by label",
 * "can reach scene") instead of frame-index bookkeeping.
 */
export class StoryTestRunner {
  readonly engine: KataEngine;
  private scenes: KSONScene[] = [];
  private graph = new SceneGraph();
  private framesArr: KSONFrame[] = [];
  private dialogue: string[] = [];
  private speakers: string[] = [];
  private ended = false;
  private endedSceneId: string | null = null;
  private maxSteps: number;

  constructor(
    sources: string | string[] | KSONScene[],
    initialCtx: Record<string, any> = {},
    options: StoryTestRunnerOptions = {}
  ) {
    this.maxSteps = options.maxSteps ?? 1000;
    this.engine = new KataEngine(initialCtx);

    const inputs = Array.isArray(sources) ? sources : [sources];
    for (const src of inputs) {
      const scene = typeof src === "string" ? parseKata(src) : src;
      this.scenes.push(scene);
      this.engine.registerScene(scene);
    }

    this.graph.buildFromScenes(this.scenes);

    this.engine.on("update", (frame: KSONFrame) => {
      this.framesArr.push(frame);
      if (frame.action.type === "text") {
        this.dialogue.push(frame.action.content);
        if (frame.action.speaker) this.speakers.push(frame.action.speaker);
      }
    });

    this.engine.on("end", (payload: { sceneId: string }) => {
      this.ended = true;
      this.endedSceneId = payload.sceneId;
    });
  }

  // ─── Playback ───────────────────────────────────────────────

  start(sceneId: string): void {
    this.ended = false;
    this.endedSceneId = null;
    this.engine.start(sceneId);
  }

  /**
   * Advance until the next choice frame appears, or the scene ends.
   * Throws if neither happens within maxSteps.
   */
  advanceUntilChoice(): void {
    let steps = 0;
    while (!this.ended) {
      const last = this.framesArr[this.framesArr.length - 1];
      if (last && last.action.type === "choice") return;
      if (steps++ >= this.maxSteps) {
        throw new Error(
          `advanceUntilChoice: no choice reached after ${this.maxSteps} steps (last action: ${last?.action.type ?? "none"})`
        );
      }
      this.engine.next();
    }
  }

  /**
   * Advance until a text frame containing `substring` appears.
   * Throws if not seen within maxSteps.
   */
  advanceUntilText(substring: string): void {
    if (this.dialogueLog.some((line) => line.includes(substring))) return;
    let steps = 0;
    while (!this.ended) {
      const last = this.framesArr[this.framesArr.length - 1];
      if (last && last.action.type === "text" && last.action.content.includes(substring)) {
        return;
      }
      if (last && last.action.type === "choice") {
        throw new Error(
          `advanceUntilText("${substring}"): blocked at a choice. Available: [${this.currentChoices.join(", ")}]`
        );
      }
      if (steps++ >= this.maxSteps) {
        throw new Error(`advanceUntilText("${substring}"): not seen after ${this.maxSteps} steps`);
      }
      this.engine.next();
    }
    throw new Error(`advanceUntilText("${substring}"): scene ended without matching text`);
  }

  /** Select a choice by its label. Throws if no current choice or label not found. */
  choose(label: string): void {
    const last = this.framesArr[this.framesArr.length - 1];
    if (!last || last.action.type !== "choice") {
      throw new Error(`choose("${label}"): current frame is not a choice (got ${last?.action.type ?? "none"})`);
    }
    const match = last.action.choices.find((c: Choice) => c.label === label);
    if (!match) {
      const available = last.action.choices.map((c: Choice) => c.label).join(", ");
      throw new Error(`choose("${label}"): not found. Available: [${available}]`);
    }
    this.engine.makeChoice(match.id);
  }

  // ─── Inspection ─────────────────────────────────────────────

  get currentFrame(): KSONFrame | null {
    return this.framesArr[this.framesArr.length - 1] ?? null;
  }

  get currentChoices(): string[] {
    const last = this.currentFrame;
    if (!last || last.action.type !== "choice") return [];
    return last.action.choices.map((c: Choice) => c.label);
  }

  get frames(): KSONFrame[] {
    return this.framesArr.slice();
  }

  get dialogueLog(): string[] {
    return this.dialogue.slice();
  }

  get speakerLog(): string[] {
    return this.speakers.slice();
  }

  get ctx(): Record<string, any> {
    const last = this.currentFrame;
    return last ? last.state.ctx : {};
  }

  get isEnded(): boolean {
    return this.ended;
  }

  get endedScene(): string | null {
    return this.endedSceneId;
  }

  /** Static graph reachability check across all registered scenes. */
  canReach(sceneId: string, fromSceneId?: string): boolean {
    const start = fromSceneId ?? this.currentFrame?.state.currentSceneId ?? this.scenes[0]?.meta.id;
    if (!start) return false;
    const reachable = this.graph.getReachable(start, Infinity);
    return reachable.includes(sceneId);
  }
}
