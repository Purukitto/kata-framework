import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const VALID_NAME = /^[a-z0-9-]+$/;

export type Template = "minimal" | "react" | "multiplayer";

export const TEMPLATES: Template[] = ["minimal", "react", "multiplayer"];

export interface ScaffoldOptions {
  template?: Template;
  targetDir?: string;
}

export interface ScaffoldResult {
  success: boolean;
  dir: string;
  projectName: string;
  template: Template;
  error?: string;
}

export function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

export function validateName(name: string): string | null {
  if (!name || name.length === 0) {
    return "Project name cannot be empty";
  }
  if (!VALID_NAME.test(name)) {
    return "Project name can only contain lowercase letters, numbers, and hyphens";
  }
  return null;
}

export function scaffold(
  inputName: string,
  options: ScaffoldOptions = {}
): ScaffoldResult {
  const name = normalizeName(inputName);
  const template = options.template ?? "minimal";
  const error = validateName(name);

  if (error) {
    return { success: false, dir: "", projectName: name, template, error };
  }

  if (!TEMPLATES.includes(template)) {
    return {
      success: false,
      dir: "",
      projectName: name,
      template,
      error: `Unknown template "${template}". Available: ${TEMPLATES.join(", ")}`,
    };
  }

  const dir = resolve(options.targetDir ?? ".", name);

  if (existsSync(dir)) {
    return {
      success: false,
      dir,
      projectName: name,
      template,
      error: `Directory "${name}" already exists`,
    };
  }

  // Create directory structure
  mkdirSync(join(dir, "scenes"), { recursive: true });
  mkdirSync(join(dir, "assets"), { recursive: true });

  if (template === "react" || template === "multiplayer") {
    mkdirSync(join(dir, "src"), { recursive: true });
  }

  // Write common files
  writePackageJson(dir, name, template);
  writeTsConfig(dir, template);
  writeGitignore(dir);
  writeMainScene(dir);

  // Write template-specific files
  switch (template) {
    case "minimal":
      writeMinimalEntry(dir, name);
      break;
    case "react":
      writeReactEntry(dir, name);
      break;
    case "multiplayer":
      writeMultiplayerEntry(dir, name);
      break;
  }

  writeReadme(dir, name, template);

  return { success: true, dir, projectName: name, template };
}

// --- File generators ---

function writePackageJson(dir: string, name: string, template: Template) {
  const deps: Record<string, string> = {
    "@kata-framework/core": "^0.6.0",
  };
  const devDeps: Record<string, string> = {
    "@types/bun": "latest",
    typescript: "^5.9.3",
  };

  if (template === "react" || template === "multiplayer") {
    deps["@kata-framework/react"] = "^1.0.0";
    deps["react"] = "^19.2.4";
    deps["react-dom"] = "^19.2.4";
    devDeps["@types/react"] = "^19.2.13";
    devDeps["@types/react-dom"] = "^19.2.3";
  }

  if (template === "multiplayer") {
    deps["@kata-framework/sync"] = "^0.2.0";
  }

  const pkg: Record<string, unknown> = {
    name,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: "bun run src/index.ts",
      build: "bun build src/index.ts --outdir dist",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  if (template === "minimal") {
    pkg.scripts = {
      dev: "bun run index.ts",
      build: "bun build index.ts --outdir dist",
    };
  }

  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
}

function writeTsConfig(dir: string, template: Template) {
  const tsconfig: Record<string, unknown> = {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: "dist",
      ...(template !== "minimal" && { jsx: "react-jsx" }),
    },
    include: template === "minimal" ? ["index.ts", "scenes"] : ["src", "scenes"],
  };
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");
}

function writeGitignore(dir: string) {
  writeFileSync(
    join(dir, ".gitignore"),
    `node_modules/
dist/
*.log
`
  );
}

function writeMainScene(dir: string) {
  writeFileSync(
    join(dir, "scenes", "intro.kata"),
    `---
id: intro
title: Welcome
---

:: Narrator :: Welcome to your new Kata story!

:: Narrator :: This is a simple scene to get you started.

* [Continue the adventure] -> @scene/chapter1
* [End here] -> @scene/ending
`
  );

  writeFileSync(
    join(dir, "scenes", "chapter1.kata"),
    `---
id: chapter1
title: Chapter 1
---

:: Narrator :: You chose to continue. The adventure begins...

:: Narrator :: What will you do?

* [Explore the forest] -> @scene/ending
* [Go back] -> @scene/intro
`
  );

  writeFileSync(
    join(dir, "scenes", "ending.kata"),
    `---
id: ending
title: The End
---

:: Narrator :: Thank you for playing!

:: Narrator :: This is where your story ends — for now.
`
  );
}

function writeMinimalEntry(dir: string, name: string) {
  writeFileSync(
    join(dir, "index.ts"),
    `import { KataEngine, parseKata } from "@kata-framework/core";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const engine = new KataEngine();

// Load all .kata scenes from the scenes/ directory
const scenesDir = join(import.meta.dir, "scenes");
for (const file of readdirSync(scenesDir).filter(f => f.endsWith(".kata"))) {
  const source = readFileSync(join(scenesDir, file), "utf-8");
  const scene = parseKata(source);
  engine.registerScene(scene);
}

// Listen for frames
engine.on("update", (frame) => {
  if (frame.action.type === "text") {
    const { speaker, content } = frame.action;
    console.log(speaker ? \`\${speaker}: \${content}\` : content);
  }

  if (frame.action.type === "choice") {
    console.log("\\nChoices:");
    frame.action.choices.forEach((c, i) => {
      console.log(\`  \${i + 1}. \${c.label}\`);
    });
    // Auto-pick first choice for demo
    engine.makeChoice(0);
    return;
  }

  engine.next();
});

engine.on("end", () => {
  console.log("\\n— The End —");
});

// Start the story
engine.start("intro");
`
  );
}

function writeReactEntry(dir: string, name: string) {
  writeFileSync(
    join(dir, "src", "index.ts"),
    `import { KataEngine, parseKata } from "@kata-framework/core";

// In a real app, load scenes via fetch or bundler
// This file bootstraps the engine for use with React
export function createEngine(sceneSources: Record<string, string>): KataEngine {
  const engine = new KataEngine();
  for (const [, source] of Object.entries(sceneSources)) {
    const scene = parseKata(source);
    engine.registerScene(scene);
  }
  return engine;
}
`
  );

  writeFileSync(
    join(dir, "src", "App.tsx"),
    `import { KataProvider, useKata } from "@kata-framework/react";
import type { KataEngine } from "@kata-framework/core";

function Story() {
  const { frame, actions } = useKata();

  if (!frame) {
    return <button onClick={() => actions.start("intro")}>Start</button>;
  }

  const { action } = frame;

  if (action.type === "text") {
    return (
      <div>
        {action.speaker && <strong>{action.speaker}</strong>}
        <p>{action.content}</p>
        <button onClick={() => actions.next()}>Continue</button>
      </div>
    );
  }

  if (action.type === "choice") {
    return (
      <div>
        <p>What do you choose?</p>
        {action.choices.map((choice, i) => (
          <button key={i} onClick={() => actions.makeChoice(i)}>
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  return <button onClick={() => actions.next()}>Continue</button>;
}

export function App({ engine }: { engine: KataEngine }) {
  return (
    <KataProvider engine={engine}>
      <Story />
    </KataProvider>
  );
}
`
  );
}

function writeMultiplayerEntry(dir: string, name: string) {
  writeFileSync(
    join(dir, "src", "index.ts"),
    `import { KataEngine, parseKata } from "@kata-framework/core";
import {
  KataSyncManager,
  BroadcastChannelTransport,
} from "@kata-framework/sync";

// In a real app, load scenes via fetch or bundler
export function createMultiplayerEngine(
  sceneSources: Record<string, string>,
  roomId: string,
  playerId: string
) {
  const engine = new KataEngine();
  for (const [, source] of Object.entries(sceneSources)) {
    const scene = parseKata(source);
    engine.registerScene(scene);
  }

  const transport = new BroadcastChannelTransport();
  const syncManager = new KataSyncManager(engine, transport, playerId);

  return { engine, syncManager, transport, roomId };
}
`
  );

  writeFileSync(
    join(dir, "src", "App.tsx"),
    `import {
  KataMultiplayerProvider,
  useKataMultiplayer,
} from "@kata-framework/react";
import type { KataSyncManager } from "@kata-framework/sync";

function MultiplayerStory() {
  const { frame, players, isAuthority } = useKataMultiplayer();

  return (
    <div>
      <div>
        <strong>Players:</strong> {players.length} |{" "}
        {isAuthority ? "You are host" : "Connected"}
      </div>

      {!frame ? (
        <p>Waiting for host to start...</p>
      ) : frame.action.type === "text" ? (
        <div>
          {frame.action.speaker && <strong>{frame.action.speaker}</strong>}
          <p>{frame.action.content}</p>
        </div>
      ) : frame.action.type === "choice" ? (
        <div>
          <p>Vote on a choice:</p>
          {frame.action.choices.map((choice, i) => (
            <button key={i}>{choice.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function App({ syncManager }: { syncManager: KataSyncManager }) {
  return (
    <KataMultiplayerProvider syncManager={syncManager}>
      <MultiplayerStory />
    </KataMultiplayerProvider>
  );
}
`
  );
}

function writeReadme(dir: string, name: string, template: Template) {
  const templateDesc: Record<Template, string> = {
    minimal: "A minimal Kata story that runs in the terminal.",
    react: "A React-based Kata story with UI components.",
    multiplayer:
      "A multiplayer Kata story using @kata-framework/sync for real-time collaboration.",
  };

  writeFileSync(
    join(dir, "README.md"),
    `# ${name}

${templateDesc[template]}

Created with [create-kata](https://www.npmjs.com/package/create-kata).

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

## Project Structure

\`\`\`
${name}/
  scenes/          # .kata scene files
    intro.kata
    chapter1.kata
    ending.kata
  assets/          # images, audio, video
${template !== "minimal" ? "  src/             # application source\n" : ""}  package.json
\`\`\`

## Writing Scenes

Edit the \`.kata\` files in \`scenes/\` to build your narrative. See the [Kata Framework docs](https://github.com/user/kata-framework) for the full \`.kata\` file format.

## License

MIT
`
  );
}

// --- CLI entry point ---

function printUsage() {
  console.log(`
Usage: create-kata-story <project-name> [options]

Options:
  --template <name>   Template to use (default: minimal)
                      Available: ${TEMPLATES.join(", ")}
  --help              Show this help message

Examples:
  bun create kata-story my-story
  bun create kata-story my-story --template react
  bun create kata-story my-story --template multiplayer
`);
}

function parseArgs(argv: string[]): {
  name?: string;
  template?: Template;
  help: boolean;
} {
  const result: { name?: string; template?: Template; help: boolean } = {
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--template" || arg === "-t") {
      result.template = argv[++i] as Template;
    } else if (!arg.startsWith("-")) {
      result.name = arg;
    }
  }

  return result;
}

if (import.meta.main) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.name) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const result = scaffold(args.name, { template: args.template });

  if (!result.success) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`\nCreated "${result.projectName}" using the ${result.template} template.`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${result.projectName}`);
  console.log(`  bun install`);
  console.log(`  bun run dev`);
}
