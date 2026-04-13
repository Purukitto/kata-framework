#!/usr/bin/env bun
/**
 * Sync kata documentation into the sibling purukitto-web repo.
 *
 * Responsibilities:
 *   1. Verify ../purukitto-web exists; fail loud if it doesn't.
 *   2. Mirror docs/site/        → web/src/content/kata-docs/  (prose)
 *   3. Mirror docs-generated/api → web/src/content/kata-docs/api/  (TypeDoc output)
 *   4. Copy docs-playground/dist → web/public/kata-playground/kata-playground.js
 *   5. Write a manifest JSON so the web side can show the generation timestamp
 *      and package versions it was built against.
 *
 * Idempotent: safe to re-run. Only touches namespaces it owns.
 */

import { readdir, stat, mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const WEB_ROOT = resolve(ROOT, "..", "purukitto-web");
const SRC_PROSE = join(ROOT, "docs", "site");
const SRC_API = join(ROOT, "docs-generated", "api");
const SRC_PLAYGROUND_DIST = join(ROOT, "packages", "docs-playground", "dist", "index.js");

const DEST_CONTENT = join(WEB_ROOT, "src", "content", "kata-docs");
const DEST_API = join(DEST_CONTENT, "api");
const DEST_PLAYGROUND = join(WEB_ROOT, "public", "kata-playground", "kata-playground.js");
const DEST_MANIFEST = join(DEST_CONTENT, "_manifest.json");

const PACKAGES_TO_VERSION = [
  "kata-core",
  "kata-react",
  "kata-sync",
  "kata-cli",
  "kata-lsp",
  "kata-test-utils",
  "kata-devtools",
];

async function ensureDir(p: string) {
  await mkdir(p, { recursive: true });
}

async function* walk(dir: string): AsyncGenerator<string> {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function mirrorDir(src: string, dest: string, opts: { clean: boolean }) {
  if (!existsSync(src)) return 0;
  if (opts.clean && existsSync(dest)) {
    await rm(dest, { recursive: true, force: true });
  }
  await ensureDir(dest);
  let count = 0;
  for await (const file of walk(src)) {
    const rel = relative(src, file);
    const target = join(dest, rel);
    await ensureDir(dirname(target));
    await copyFile(file, target);
    count += 1;
  }
  return count;
}

async function readPackageVersion(pkgDir: string): Promise<string | null> {
  const pkgJson = join(ROOT, "packages", pkgDir, "package.json");
  if (!existsSync(pkgJson)) return null;
  try {
    const raw = await readFile(pkgJson, "utf8");
    return JSON.parse(raw).version as string;
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(WEB_ROOT)) {
    console.error(
      `[docs:sync] FATAL: expected sibling repo at ${WEB_ROOT} but it does not exist.\n` +
        `Clone purukitto-web next to kata-framework and re-run.`,
    );
    process.exit(1);
  }

  console.log(`[docs:sync] web repo: ${WEB_ROOT}`);

  // 1. Mirror prose
  const proseCount = await mirrorDir(SRC_PROSE, DEST_CONTENT, { clean: false });
  console.log(`[docs:sync] prose files copied: ${proseCount}`);

  // 2. Mirror API (clean target — TypeDoc owns this subtree)
  const apiCount = await mirrorDir(SRC_API, DEST_API, { clean: true });
  console.log(`[docs:sync] api files copied: ${apiCount}`);

  // 3. Copy playground bundle
  if (existsSync(SRC_PLAYGROUND_DIST)) {
    await ensureDir(dirname(DEST_PLAYGROUND));
    await copyFile(SRC_PLAYGROUND_DIST, DEST_PLAYGROUND);
    console.log(`[docs:sync] playground copied: ${DEST_PLAYGROUND}`);
  } else {
    console.warn(
      `[docs:sync] WARNING: ${SRC_PLAYGROUND_DIST} missing. Run \`bun --filter @kata-framework/docs-playground run build\` first.`,
    );
  }

  // 4. Write manifest
  const versions: Record<string, string> = {};
  for (const pkg of PACKAGES_TO_VERSION) {
    const v = await readPackageVersion(pkg);
    if (v) versions[pkg] = v;
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    versions,
  };
  await ensureDir(dirname(DEST_MANIFEST));
  await writeFile(DEST_MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`[docs:sync] manifest written: ${DEST_MANIFEST}`);

  console.log(`[docs:sync] done`);
}

main().catch((err) => {
  console.error(`[docs:sync] failed:`, err);
  process.exit(1);
});
