import type { KSONAction, Choice } from "../types";
import type { KataPlugin } from "../runtime/plugin";

export interface AnalyticsReport {
  sceneVisits: Record<string, number>;
  choiceSelections: Record<string, number>;
  averageActionsPerScene: Record<string, number>;
  dropOffPoints: string[];
  sessionDuration: number;
}

export interface AnalyticsPlugin extends KataPlugin {
  getReport(): AnalyticsReport;
  toJSON(): AnalyticsReport;
  reset(): void;
}

export function analyticsPlugin(): AnalyticsPlugin {
  const sceneVisits: Record<string, number> = {};
  const choiceSelections: Record<string, number> = {};
  const actionsPerScene: Record<string, number[]> = {};
  const endedScenes = new Set<string>();
  const scenesWithOutboundChoices = new Set<string>();
  let sessionStart = Date.now();
  let currentScene: string | null = null;
  let actionsInCurrentScene = 0;

  function flushCurrentScene() {
    if (currentScene) {
      if (!actionsPerScene[currentScene]) actionsPerScene[currentScene] = [];
      actionsPerScene[currentScene]!.push(actionsInCurrentScene);
    }
  }

  return {
    name: "analytics",

    beforeSceneChange(_fromId: string | null, toId: string, _ctx: Record<string, any>) {
      flushCurrentScene();
      sceneVisits[toId] = (sceneVisits[toId] ?? 0) + 1;
      currentScene = toId;
      actionsInCurrentScene = 0;
    },

    afterAction(_action: KSONAction, _ctx: Record<string, any>) {
      actionsInCurrentScene++;
    },

    onChoice(choice: Choice, _ctx: Record<string, any>) {
      choiceSelections[choice.id] = (choiceSelections[choice.id] ?? 0) + 1;
      if (currentScene) {
        scenesWithOutboundChoices.add(currentScene);
      }
    },

    onEnd(sceneId: string) {
      flushCurrentScene();
      endedScenes.add(sceneId);
    },

    getReport(): AnalyticsReport {
      const averageActionsPerScene: Record<string, number> = {};
      for (const [sceneId, counts] of Object.entries(actionsPerScene)) {
        const sum = counts.reduce((a, b) => a + b, 0);
        averageActionsPerScene[sceneId] = sum / counts.length;
      }

      // Drop-off points: scenes where "end" fires but no outbound choices were used
      const dropOffPoints = [...endedScenes].filter(
        (s) => !scenesWithOutboundChoices.has(s)
      );

      return {
        sceneVisits: { ...sceneVisits },
        choiceSelections: { ...choiceSelections },
        averageActionsPerScene,
        dropOffPoints,
        sessionDuration: Date.now() - sessionStart,
      };
    },

    toJSON(): AnalyticsReport {
      return this.getReport();
    },

    reset() {
      Object.keys(sceneVisits).forEach((k) => delete sceneVisits[k]);
      Object.keys(choiceSelections).forEach((k) => delete choiceSelections[k]);
      Object.keys(actionsPerScene).forEach((k) => delete actionsPerScene[k]);
      endedScenes.clear();
      scenesWithOutboundChoices.clear();
      sessionStart = Date.now();
      currentScene = null;
      actionsInCurrentScene = 0;
    },
  };
}
