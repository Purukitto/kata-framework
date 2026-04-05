# @kata-framework/cli

CLI tool for the Kata narrative framework. Build `.kata` files into KSON JSON, watch for changes, and visualize scene graphs.

## Install

```bash
bun add -g @kata-framework/cli
```

## Commands

### `kata build <glob>`

Parse `.kata` files and write `.kson.json` to an output directory.

```bash
kata build "scenes/**/*.kata" -o dist/kson
# Output: dist/kson/intro.kson.json, dist/kson/shop.kson.json, ...
```

### `kata watch <glob>`

Build + watch for changes, rebuilding on save.

```bash
kata watch "scenes/**/*.kata" -o dist/kson
```

### `kata graph <glob>`

Visualize scene connections and detect structural issues.

```bash
# DOT format (pipe to Graphviz or online renderers)
kata graph "scenes/**/*.kata" --format dot > story.dot

# JSON format (for custom tooling)
kata graph "scenes/**/*.kata" --format json

# Lint for problems
kata graph "scenes/**/*.kata" --lint
# ⚠ Orphaned scene: "secret-ending" (no inbound edges)
# ⚠ Dead end: "bad-ending" (no choices, no outbound edges)
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory for build/watch | `dist/kson` |
| `-f, --format <fmt>` | Graph format: `dot` or `json` | `dot` |
| `--lint` | Check for orphaned scenes and dead ends | — |
| `-h, --help` | Show help | — |

## Configuration

Create a `kata.config.json` in your project root to avoid repeating flags:

```json
{
  "input": "scenes/**/*.kata",
  "output": "dist/kson"
}
```

Resolution order: **CLI flags → `kata.config.json` → defaults** (`**/*.kata`, `dist/kson`).

Depends on `@kata-framework/core` for parsing.
