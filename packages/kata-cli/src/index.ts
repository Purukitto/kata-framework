import { build } from "./commands/build";
import { watchCommand } from "./commands/watch";
import { resolveConfig } from "./config";

const USAGE = `
Usage: kata <command> [glob] [options]

Commands:
  build <glob>   Parse .kata files and write .kson.json to output dir
  watch <glob>   Build + watch for changes

Options:
  -o, --output <dir>   Output directory (default: dist/kson)
  -h, --help           Show this help message
`.trim();

function parseArgs(argv: string[]) {
  const args = argv.slice(2); // skip "bun" and script path
  const command = args[0];
  let glob: string | undefined;
  let output: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (!glob) {
      glob = args[i];
    }
  }

  return { command, glob, output };
}

async function main() {
  const { command, glob, output } = parseArgs(process.argv);

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
