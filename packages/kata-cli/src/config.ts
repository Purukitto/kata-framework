import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface CliConfig {
  input: string;
  output: string;
}

const DEFAULTS: CliConfig = {
  input: "**/*.kata",
  output: "dist/kson",
};

export function resolveConfig(args: { input?: string; output?: string }): CliConfig {
  // CLI args take highest priority
  if (args.input && args.output) {
    return { input: args.input, output: args.output };
  }

  // Try kata.config.json in CWD
  let fileConfig: Partial<CliConfig> = {};
  const configPath = resolve(process.cwd(), "kata.config.json");
  if (existsSync(configPath)) {
    try {
      const raw = require(configPath);
      fileConfig = {
        input: typeof raw.input === "string" ? raw.input : undefined,
        output: typeof raw.output === "string" ? raw.output : undefined,
      };
    } catch {
      // ignore invalid config
    }
  }

  return {
    input: args.input ?? fileConfig.input ?? DEFAULTS.input,
    output: args.output ?? fileConfig.output ?? DEFAULTS.output,
  };
}
