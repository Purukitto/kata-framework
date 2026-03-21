import { watch } from "node:fs";
import { resolve, basename } from "node:path";
import { build } from "./build";
import { parseKata } from "@kata-framework/core";
import { mkdirSync } from "node:fs";

export async function watchCommand(globPattern: string, outputDir: string): Promise<void> {
  // Run initial build
  console.log("Running initial build...\n");
  await build(globPattern, outputDir);

  // Determine watch directory from glob pattern
  // Use the non-glob prefix as watch root, or CWD
  const parts = globPattern.split(/[*?{[]/);
  const watchDir = resolve(process.cwd(), parts[0] || ".");
  const absOutput = resolve(process.cwd(), outputDir);

  console.log(`\nWatching ${watchDir} for .kata changes...\n`);

  watch(watchDir, { recursive: true }, async (eventType, filename) => {
    if (!filename || !filename.endsWith(".kata")) return;

    const filePath = resolve(watchDir, filename);
    const name = basename(filename, ".kata");

    try {
      const content = await Bun.file(filePath).text();
      const scene = parseKata(content);
      mkdirSync(absOutput, { recursive: true });
      await Bun.write(resolve(absOutput, `${name}.kson.json`), JSON.stringify(scene, null, 2));
      console.log(`  ↻ Rebuilt ${filename} -> ${name}.kson.json`);
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
