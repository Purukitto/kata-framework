import { describe, test, expect } from "bun:test";
import { createTestEngine, collectFrames } from "@kata-framework/test-utils";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const scenesDir = join(import.meta.dir, "..", "..", "scenes");

function findKataFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findKataFiles(full));
    } else if (entry.endsWith(".kata")) {
      results.push(full);
    }
  }
  return results;
}

function loadAllScenes(): string[] {
  return findKataFiles(scenesDir).map((f) => readFileSync(f, "utf-8"));
}

describe("regression: full playthroughs", () => {
  // Path 1: Quick exit — prologue → booth → shutdown
  describe("Path 1: Shutdown ending (quick exit)", () => {
    test("reaches shutdown ending through booth sign-off", () => {
      const { engine } = createTestEngine(loadAllScenes());
      let ended = false;
      let endedSceneId = "";
      engine.on("end", () => { ended = true; });

      const allFrames = collectFrames(engine, "prologue", {
        autoPick: (choices) => {
          // prologue: pick "Enter the studio" → booth
          // booth (intel=0, else branch): c_0=first_broadcast, c_1=shutdown
          const shutdownChoice = choices.find((c) => c.label.includes("Sign off") || c.label.includes("dangerous"));
          if (shutdownChoice) return shutdownChoice.id;
          return choices[0].id; // default: first choice
        },
      });

      expect(ended).toBe(true);

      // Should have visited prologue and booth
      const textFrames = allFrames.filter((f) => f.action.type === "text");
      expect(textFrames.length).toBeGreaterThan(5);

      // Final text should be the shutdown ending
      const lastText = textFrames[textFrames.length - 1];
      expect(lastText.action.content).toContain("station goes dark");

      // Ctx should remain at initial values (no broadcasts aired)
      const finalCtx = lastText.state.ctx;
      expect(finalCtx.listeners).toBe(0);
      expect(finalCtx.intel).toBe(0);
    });
  });

  // Path 2: Liberation ending — prologue → booth → first_broadcast → caller_maria → signal_tower → editorial_choice → liberation
  describe("Path 2: Liberation ending (via Maria)", () => {
    test("reaches liberation through Maria caller and signal tower", () => {
      const { engine } = createTestEngine(loadAllScenes());
      let ended = false;
      engine.on("end", () => { ended = true; });

      const visitedScenes = new Set<string>();

      const allFrames = collectFrames(engine, "prologue", {
        autoPick: (choices) => {
          // Track which scene we're in based on choices
          const labels = choices.map((c) => c.label);

          // prologue: Enter the studio
          if (labels.some((l) => l.includes("Enter the studio"))) return choices[0].id;

          // booth: Lead with the news (first_broadcast)
          if (labels.some((l) => l.includes("Lead with the news"))) {
            return choices.find((c) => c.label.includes("Lead with the news"))!.id;
          }

          // first_broadcast: Patch through Maria
          if (labels.some((l) => l.includes("Maria"))) {
            return choices.find((c) => c.label.includes("Maria"))!.id;
          }

          // caller_maria: Head to signal tower
          if (labels.some((l) => l.includes("signal tower"))) {
            return choices.find((c) => c.label.includes("signal tower"))!.id;
          }

          // signal_tower → editorial_choice
          if (labels.some((l) => l.includes("Rush back") || l.includes("Back to the booth"))) {
            return choices[0].id;
          }

          // editorial_choice (intel=1, elseif branch): Share what we know → liberation
          if (labels.some((l) => l.includes("Share what we know"))) {
            return choices.find((c) => c.label.includes("Share what we know"))!.id;
          }

          return choices[0].id;
        },
      });

      expect(ended).toBe(true);

      const textFrames = allFrames.filter((f) => f.action.type === "text");
      const lastText = textFrames[textFrames.length - 1];
      expect(lastText.action.content).toContain("signal lives on");

      // Should have gained listeners through first_broadcast and caller_maria
      const finalCtx = lastText.state.ctx;
      expect(finalCtx.listeners).toBeGreaterThan(0);
      expect(finalCtx.intel).toBeGreaterThanOrEqual(1);
      expect(finalCtx.broadcastsAired).toBeGreaterThanOrEqual(1);
    });
  });

  // Path 3: Underground ending — prologue → booth → first_broadcast → caller_vex → signal_tower → editorial_choice → underground
  describe("Path 3: Underground ending (via Vex)", () => {
    test("reaches underground through Vex caller", () => {
      const { engine } = createTestEngine(loadAllScenes());
      let ended = false;
      engine.on("end", () => { ended = true; });

      const allFrames = collectFrames(engine, "prologue", {
        autoPick: (choices) => {
          const labels = choices.map((c) => c.label);

          // prologue
          if (labels.some((l) => l.includes("Enter the studio"))) return choices[0].id;

          // booth: Lead with the news
          if (labels.some((l) => l.includes("Lead with the news"))) {
            return choices.find((c) => c.label.includes("Lead with the news"))!.id;
          }

          // first_broadcast: Take anonymous tip (Vex)
          if (labels.some((l) => l.includes("Vex"))) {
            return choices.find((c) => c.label.includes("Vex"))!.id;
          }

          // caller_vex: Head to signal tower
          if (labels.some((l) => l.includes("signal tower"))) {
            return choices.find((c) => c.label.includes("signal tower"))!.id;
          }

          // signal_tower → editorial_choice
          if (labels.some((l) => l.includes("Rush back") || l.includes("Back to the booth"))) {
            return choices[0].id;
          }

          // editorial_choice (intel=2, elseif branch): Go dark → underground
          if (labels.some((l) => l.includes("Go dark"))) {
            return choices.find((c) => c.label.includes("Go dark"))!.id;
          }

          return choices[0].id;
        },
      });

      expect(ended).toBe(true);

      const textFrames = allFrames.filter((f) => f.action.type === "text");
      const lastText = textFrames[textFrames.length - 1];
      expect(lastText.action.content).toContain("signal will return");

      // Vex gives intel +2 and suspicion +2
      const finalCtx = lastText.state.ctx;
      expect(finalCtx.intel).toBeGreaterThanOrEqual(2);
      expect(finalCtx.suspicion).toBeGreaterThanOrEqual(2);
    });
  });

  // Cross-cutting concerns
  describe("cross-cutting verification", () => {
    test("all 3 endings are distinct", () => {
      const endTexts: string[] = [];

      // Shutdown
      const { engine: e1 } = createTestEngine(loadAllScenes());
      let e1ended = false;
      e1.on("end", () => { e1ended = true; });
      const f1 = collectFrames(e1, "prologue", {
        autoPick: (choices) => {
          const off = choices.find((c) => c.label.includes("Sign off") || c.label.includes("dangerous"));
          return off ? off.id : choices[0].id;
        },
      });
      const t1 = f1.filter((f) => f.action.type === "text");
      endTexts.push(t1[t1.length - 1].action.content);

      // Liberation
      const { engine: e2 } = createTestEngine(loadAllScenes());
      let e2ended = false;
      e2.on("end", () => { e2ended = true; });
      const f2 = collectFrames(e2, "prologue", {
        autoPick: (choices) => {
          const labels = choices.map((c) => c.label);
          if (labels.some((l) => l.includes("Maria"))) return choices.find((c) => c.label.includes("Maria"))!.id;
          if (labels.some((l) => l.includes("signal tower"))) return choices.find((c) => c.label.includes("signal tower"))!.id;
          if (labels.some((l) => l.includes("Share what we know"))) return choices.find((c) => c.label.includes("Share what we know"))!.id;
          if (labels.some((l) => l.includes("Lead with the news"))) return choices.find((c) => c.label.includes("Lead with the news"))!.id;
          return choices[0].id;
        },
      });
      const t2 = f2.filter((f) => f.action.type === "text");
      endTexts.push(t2[t2.length - 1].action.content);

      // Underground
      const { engine: e3 } = createTestEngine(loadAllScenes());
      let e3ended = false;
      e3.on("end", () => { e3ended = true; });
      const f3 = collectFrames(e3, "prologue", {
        autoPick: (choices) => {
          const labels = choices.map((c) => c.label);
          if (labels.some((l) => l.includes("Vex"))) return choices.find((c) => c.label.includes("Vex"))!.id;
          if (labels.some((l) => l.includes("signal tower"))) return choices.find((c) => c.label.includes("signal tower"))!.id;
          if (labels.some((l) => l.includes("Go dark"))) return choices.find((c) => c.label.includes("Go dark"))!.id;
          if (labels.some((l) => l.includes("Lead with the news"))) return choices.find((c) => c.label.includes("Lead with the news"))!.id;
          return choices[0].id;
        },
      });
      const t3 = f3.filter((f) => f.action.type === "text");
      endTexts.push(t3[t3.length - 1].action.content);

      expect(e1ended).toBe(true);
      expect(e2ended).toBe(true);
      expect(e3ended).toBe(true);

      // All 3 endings should be different
      expect(endTexts[0]).not.toBe(endTexts[1]);
      expect(endTexts[1]).not.toBe(endTexts[2]);
      expect(endTexts[0]).not.toBe(endTexts[2]);
    });

    test("exec blocks correctly modify context across scenes", () => {
      const { engine } = createTestEngine(loadAllScenes());
      const allFrames = collectFrames(engine, "prologue", {
        autoPick: (choices) => {
          const labels = choices.map((c) => c.label);
          if (labels.some((l) => l.includes("Maria"))) return choices.find((c) => c.label.includes("Maria"))!.id;
          if (labels.some((l) => l.includes("signal tower"))) return choices.find((c) => c.label.includes("signal tower"))!.id;
          if (labels.some((l) => l.includes("Share what we know"))) return choices.find((c) => c.label.includes("Share what we know"))!.id;
          if (labels.some((l) => l.includes("Lead with the news"))) return choices.find((c) => c.label.includes("Lead with the news"))!.id;
          return choices[0].id;
        },
      });

      // Track ctx evolution through key scenes
      const ctxSnapshots: Record<string, any>[] = [];
      for (const f of allFrames) {
        if (f.action.type === "text") {
          ctxSnapshots.push({ ...f.state.ctx });
        }
      }

      // ctx should start at 0 and grow through the playthrough
      expect(ctxSnapshots[0].intel).toBe(0);
      expect(ctxSnapshots[0].listeners).toBe(0);

      // Later in the playthrough, values should have increased
      const final = ctxSnapshots[ctxSnapshots.length - 1];
      expect(final.listeners).toBeGreaterThan(0);
      expect(final.broadcastsAired).toBeGreaterThanOrEqual(1);
    });
  });
});
