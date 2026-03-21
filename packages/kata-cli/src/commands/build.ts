import { parseKata } from "@kata-framework/core";
import { resolve, basename, dirname } from "node:path";
import { mkdirSync } from "node:fs";

export async function build(globPattern: string, outputDir: string): Promise<void> {
  const absOutput = resolve(process.cwd(), outputDir);
  mkdirSync(absOutput, { recursive: true });

  const glob = new Bun.Glob(globPattern);
  const files = Array.from(glob.scanSync({ cwd: process.cwd(), absolute: true }));

  if (files.length === 0) {
    console.log("No .kata files matched the pattern.");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const filePath of files) {
    try {
      const content = await Bun.file(filePath).text();
      const scene = parseKata(content);
      const name = basename(filePath, ".kata");
      const outPath = resolve(absOutput, `${name}.kson.json`);
      await Bun.write(outPath, JSON.stringify(scene, null, 2));
      processed++;
      console.log(`  ✓ ${basename(filePath)} -> ${name}.kson.json`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${basename(filePath)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nDone: ${processed} processed, ${errors} error(s).`);
}
