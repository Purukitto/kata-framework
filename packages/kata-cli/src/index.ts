import { build } from "./commands/build";
import { watchCommand } from "./commands/watch";
import { graph, type GraphFormat } from "./commands/graph";
import { resolveConfig } from "./config";

const USAGE = `
Usage: kata <command> [glob] [options]

Commands:
  build <glob>   Parse .kata files and write .kson.json to output dir
  watch <glob>   Build + watch for changes
  graph <glob>   Visualize scene connections

Options:
  -o, --output <dir>     Output directory (default: dist/kson)
  -f, --format <fmt>     Graph format: dot or json (default: dot)
  --lint                 Check for orphaned scenes and dead ends
  -h, --help             Show this help message
`.trim();

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const command = args[0];
  let glob: string | undefined;
  let output: string | undefined;
  let format: GraphFormat = "dot";
  let lint = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (args[i] === "-f" || args[i] === "--format") {
      format = args[++i] as GraphFormat;
    } else if (args[i] === "--lint") {
      lint = true;
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (!glob) {
      glob = args[i];
    }
  }

  return { command, glob, output, format, lint };
}

async function main() {
  const { command, glob, output, format, lint } = parseArgs(process.argv);

  if (!command || command === "help") {
    console.log(USAGE);
    process.exit(0);
  }

  const config = resolveConfig({ input: glob, output });

  switch (command) {
    case "build":
      await build(config.input, config.output);
      break;
    case "watch":
      await watchCommand(config.input, config.output);
      break;
    case "graph":
      await graph(config.input, { format, lint });
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
