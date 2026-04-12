import { renderToReadableStream } from "react-dom/server";
import { join } from "path";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { loadScenes } from "./engine";
import { parseLocaleYaml } from "@kata-framework/core";
import { App } from "./App";

const scenesDir = join(import.meta.dir, "..", "scenes");
const localesDir = join(import.meta.dir, "..", "locales");
const scenes = loadScenes(scenesDir);

// Load locale data from disk
interface LocaleEntry { sceneId: string; locale: string; overrides: any[] }
const localeEntries: LocaleEntry[] = [];

if (existsSync(localesDir)) {
  for (const lang of readdirSync(localesDir)) {
    const langDir = join(localesDir, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const file of readdirSync(langDir)) {
      if (!file.endsWith(".yaml")) continue;
      const content = readFileSync(join(langDir, file), "utf-8");
      const data = parseLocaleYaml(content);
      const sceneId = file.replace(".yaml", "");
      localeEntries.push({ sceneId, locale: data.locale, overrides: data.overrides });
    }
  }
}

// Build the client bundle on startup
const clientBuild = await Bun.build({
  entrypoints: [join(import.meta.dir, "client.tsx")],
  outdir: join(import.meta.dir, "..", ".dev"),
  naming: "client.js",
  target: "browser",
  external: [],
});

if (!clientBuild.success) {
  console.error("Client build failed:");
  for (const log of clientBuild.logs) {
    console.error(log);
  }
  process.exit(1);
}

const globalCss = await Bun.file(join(import.meta.dir, "styles", "global.css")).text();
const studioCss = await Bun.file(join(import.meta.dir, "styles", "studio.css")).text();
const componentsCss = await Bun.file(join(import.meta.dir, "styles", "components.css")).text();
const clientJs = await Bun.file(join(import.meta.dir, "..", ".dev", "client.js")).text();

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/client.js") {
      return new Response(clientJs, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const scenesJson = JSON.stringify(scenes);
    const localesJson = JSON.stringify(localeEntries);

    const stream = await renderToReadableStream(
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>The Last Broadcast — Kata Framework Tech Demo</title>
          <style dangerouslySetInnerHTML={{ __html: globalCss + studioCss + componentsCss }} />
        </head>
        <body>
          <div id="root">
            <App scenes={scenes} locales={localeEntries} />
          </div>
          <script dangerouslySetInnerHTML={{
            __html: `window.__SCENES__=${JSON.stringify(scenesJson)};window.__LOCALES__=${JSON.stringify(localesJson)};`
          }} />
          <script src="/client.js" type="module" />
        </body>
      </html>
    );

    return new Response(stream, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`\n  The Last Broadcast — Kata Framework Tech Demo`);
console.log(`  Running at http://localhost:${server.port}\n`);
