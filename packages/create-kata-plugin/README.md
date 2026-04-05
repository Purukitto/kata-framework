# create-kata-plugin

Scaffold a new [Kata Framework](https://github.com/user/kata-framework) plugin project in seconds.

## Usage

```bash
bun create kata-plugin my-feature
```

This creates a `kata-plugin-my-feature/` directory with:

```
kata-plugin-my-feature/
  src/
    index.ts          # Plugin factory + KataPlugin implementation
  tests/
    index.test.ts     # Starter test using @kata-framework/test-utils
  package.json        # Peer dep on @kata-framework/core, tsup build config
  tsconfig.json
  tsup.config.ts
  README.md
```

## What You Get

- **TypeScript** with `moduleResolution: "bundler"` and `verbatimModuleSyntax: true`
- **tsup** build producing CJS + ESM + DTS
- **bun:test** starter test that passes out of the box
- **Correct `peerDependencies`** on `@kata-framework/core`
- **Plugin factory** following the official closure pattern

## Naming Convention

Input names are normalized to `kata-plugin-{name}`:

```bash
bun create kata-plugin my-feature     # → kata-plugin-my-feature
bun create kata-plugin "My Feature"   # → kata-plugin-my-feature
```

Names can only contain lowercase letters, numbers, and hyphens.

## After Scaffolding

```bash
cd kata-plugin-my-feature
bun install
bun test    # verify starter test passes
bun run build
```

Then implement your plugin by editing `src/index.ts`. See the [Plugin Authoring Guide](https://github.com/user/kata-framework/blob/main/docs/plugins.md) for hook reference, state management patterns, and publishing tips.

## Programmatic API

```ts
import { scaffold, normalizeName, validateName } from "create-kata-plugin";

const result = scaffold("my-feature", "/target/dir");
// { success: true, dir: "/target/dir/kata-plugin-my-feature", packageName: "kata-plugin-my-feature" }
```
