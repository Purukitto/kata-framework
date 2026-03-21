import { z } from "zod";
import type { GameStateSnapshot, KSONAction } from "../types";

export const CURRENT_SCHEMA_VERSION = 2;

const KSONActionSchema: z.ZodType<KSONAction> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("text"), speaker: z.string(), content: z.string() }),
    z.object({
      type: z.literal("choice"),
      choices: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          target: z.string().optional(),
          action: z.string().optional(),
          condition: z.string().optional(),
        })
      ),
    }),
    z.object({
      type: z.literal("visual"),
      layer: z.string(),
      src: z.string(),
      effect: z.string().optional(),
    }),
    z.object({ type: z.literal("wait"), duration: z.number() }),
    z.object({ type: z.literal("exec"), code: z.string() }),
    z.object({
      type: z.literal("condition"),
      condition: z.string(),
      then: z.array(z.lazy(() => KSONActionSchema)),
    }),
    z.object({
      type: z.literal("audio"),
      command: z.union([
        z.object({ action: z.literal("play"), id: z.string(), loop: z.boolean().optional() }),
        z.object({ action: z.literal("stop"), id: z.string() }),
        z.object({ action: z.literal("setVolume"), id: z.string(), volume: z.number() }),
        z.object({ action: z.literal("fade"), id: z.string(), toVolume: z.number(), durationMs: z.number() }),
      ]),
    }),
  ])
);

export const GameStateSnapshotSchema = z.object({
  schemaVersion: z.number().int().min(1),
  ctx: z.record(z.string(), z.any()),
  currentSceneId: z.string().nullable(),
  currentActionIndex: z.number().int().min(0),
  history: z.array(z.string()),
  expandedActions: z.array(KSONActionSchema).optional(),
  undoStack: z
    .array(
      z.object({
        ctx: z.record(z.string(), z.any()),
        currentSceneId: z.string().nullable(),
        currentActionIndex: z.number().int().min(0),
        history: z.array(z.string()),
        expandedActions: z.array(KSONActionSchema).optional(),
      })
    )
    .optional(),
});

export type Migrator = (data: any) => any;

export class SnapshotManager {
  private migrators = new Map<number, Migrator>();

  registerMigration(fromVersion: number, migrator: Migrator): void {
    this.migrators.set(fromVersion, migrator);
  }

  migrate(raw: any): GameStateSnapshot {
    if (typeof raw !== "object" || raw === null) {
      throw new Error("Invalid snapshot: must be an object");
    }

    let data = { ...raw };
    const startVersion = data.schemaVersion ?? 0;

    if (typeof startVersion !== "number") {
      throw new Error("Invalid snapshot: schemaVersion must be a number");
    }

    for (let v = startVersion; v < CURRENT_SCHEMA_VERSION; v++) {
      const migrator = this.migrators.get(v);
      if (!migrator) {
        throw new Error(
          `No migrator registered for schema version ${v} -> ${v + 1}`
        );
      }
      data = migrator(data);
    }

    data.schemaVersion = CURRENT_SCHEMA_VERSION;
    return GameStateSnapshotSchema.parse(data);
  }
}
