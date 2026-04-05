import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const VALID_NAME = /^[a-z0-9-]+$/;

export interface ScaffoldResult {
  success: boolean;
  dir: string;
  packageName: string;
  error?: string;
}

export function normalizeName(input: string): string {
  let name = input.trim().toLowerCase().replace(/\s+/g, "-");
  // Strip "kata-plugin-" prefix if already present to avoid doubling
  if (name.startsWith("kata-plugin-")) {
    name = name.slice("kata-plugin-".length);
  }
  return name;
}

export function validateName(name: string): string | null {
  if (!name || name.length === 0) {
    return "Plugin name cannot be empty";
  }
  if (!VALID_NAME.test(name)) {
    return "Plugin name can only contain lowercase letters, numbers, and hyphens";
  }
  return null;
}

export function scaffold(inputName: string, targetDir?: string): ScaffoldResult {
  const name = normalizeName(inputName);
  const error = validateName(name);
  if (error) {
    return { success: false, dir: "", packageName: "", error };
  }

  const packageName = `kata-plugin-${name}`;
  const dir = resolve(targetDir ?? ".", packageName);

  if (existsSync(dir)) {
    return { success: false, dir, packageName, error: `Directory "${packageName}" already exists` };
  }

  // Create directory structure
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });

  // package.json
  const pkg = {
    name: packageName,
    version: "0.1.0",
    type: "module",
    main: "./dist/index.cjs",
    module: "./dist/index.js",
    types: "./dist/index.d.ts",
    files: ["dist"],
    scripts: {
      build: "tsup",
      test: "bun test",
    },
    peerDependencies: {
      "@kata-framework/core": "^0.5.0",
    },
    devDependencies: {
      "@kata-framework/core": "^0.5.0",
      "@kata-framework/test-utils": "^0.3.0",
      "@types/bun": "latest",
      tsup: "^8.5.1",
      typescript: "^5.9.3",
    },
  };
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: "dist",
      declaration: true,
    },
    include: ["src/**/*.ts"],
  };
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");

  // tsup.config.ts
  writeFileSync(
    join(dir, "tsup.config.ts"),
    `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
});
`
  );

  // src/index.ts
  const className = name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  writeFileSync(
    join(dir, "src", "index.ts"),
    `import type { KataPlugin } from "@kata-framework/core";

export interface ${className}Config {
  // Add your plugin configuration here
}

export interface ${className}Plugin extends KataPlugin {
  // Add custom API methods here
}

export function ${camelCase(name)}Plugin(config?: ${className}Config): ${className}Plugin {
  return {
    name: "${packageName}",

    beforeAction(action, ctx) {
      // Transform or observe actions before they reach the UI
      return action;
    },

    afterAction(action, ctx) {
      // Observe actions after they are emitted
    },
  };
}
`
  );

  // tests/index.test.ts
  writeFileSync(
    join(dir, "tests", "index.test.ts"),
    `import { expect, test, describe } from "bun:test";
import { ${camelCase(name)}Plugin } from "../src/index";

describe("${packageName}", () => {
  test("plugin has correct name", () => {
    const plugin = ${camelCase(name)}Plugin();
    expect(plugin.name).toBe("${packageName}");
  });

  test("beforeAction passes through actions", () => {
    const plugin = ${camelCase(name)}Plugin();
    const action = { type: "text" as const, speaker: "A", content: "Hello" };
    const result = plugin.beforeAction?.(action, {});
    expect(result).toEqual(action);
  });
});
`
  );

  // README.md
  writeFileSync(
    join(dir, "README.md"),
    `# ${packageName}

A plugin for the [Kata Framework](https://github.com/user/kata-framework).

## Install

\`\`\`bash
bun add ${packageName}
\`\`\`

## Usage

\`\`\`ts
import { KataEngine } from "@kata-framework/core";
import { ${camelCase(name)}Plugin } from "${packageName}";

const engine = new KataEngine();
engine.use(${camelCase(name)}Plugin());
\`\`\`

## API

<!-- Document your plugin API here -->

## License

MIT
`
  );

  return { success: true, dir, packageName };
}

function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: create-kata-plugin <name>");
    process.exit(1);
  }
  const result = scaffold(args[0]);
  if (!result.success) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
  console.log(`Created ${result.packageName} at ${result.dir}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${result.packageName}`);
  console.log(`  bun install`);
  console.log(`  bun test`);
}
