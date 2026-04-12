# Kata Framework

VS Code extension for the [Kata Framework](https://github.com/purukitto/kata-framework) — a narrative scripting engine for interactive stories.

## Features

### Syntax Highlighting

Full TextMate grammar for `.kata` files:

- **YAML frontmatter** — scene metadata (`id`, `title`, `layout`, `assets`)
- **Script blocks** — `<script>...</script>` with JavaScript highlighting
- **Speaker dialogue** — `:: Speaker :: dialogue text`
- **Choices** — `* [Choice label] -> @scene/target`
- **Conditionals** — `:::if{cond="..."}`, `:::elseif`, `:::else`, `:::`
- **Directives** — `[bg src="file.mp4"]`, `[wait N]`, `[exec]...[/exec]`, `[tween]`
- **Interpolation** — `${expression}` variables in text
- **Comments** — `// line comments`

### Language Server (LSP)

Powered by `@kata-framework/lsp`, providing:

- **Diagnostics** — undefined variables, unreachable scene targets, duplicate scene IDs, invalid conditions
- **Autocomplete** — scene IDs, variable names, and asset keys based on cursor context
- **Hover** — variable info, asset URLs, and scene target details
- **Go-to-definition** — navigate from `-> @scene/id` to the target file
- **Document symbols** — outline with scene IDs, speakers, and choice labels

### Scene Graph Visualization

Run **Kata: Show Scene Graph** from the command palette to open an interactive force-directed graph of your scenes. The graph:

- Color-codes nodes: **green** (reachable), **yellow** (orphaned), **red** (dead ends)
- Updates live as you edit `.kata` files
- Helps identify disconnected or unreachable scenes

## Requirements

- VS Code 1.85.0 or later
- `.kata` files in your workspace

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open a project containing `.kata` files
3. Start editing — syntax highlighting and LSP features activate automatically
4. Use `Ctrl+Shift+P` → **Kata: Show Scene Graph** to visualize your story structure

## `.kata` File Example

```kata
---
id: intro
title: The Beginning
---

<script>
ctx.playerName = "Adventurer";
</script>

[bg src="forest.mp4"]

:: Narrator :: Welcome, ${playerName}. Your journey begins here.

:::if{cond="visited > 0"}
:: Narrator :: I see you've returned.
:::else
:: Narrator :: This is your first time, isn't it?
:::

* [Enter the forest] -> @scene/forest
* [Turn back] -> @scene/town
```

## Commands

| Command | Description |
|---------|-------------|
| `Kata: Show Scene Graph` | Open interactive scene graph visualization |

## Related Packages

- [`@kata-framework/core`](https://www.npmjs.com/package/@kata-framework/core) — Headless narrative engine
- [`@kata-framework/react`](https://www.npmjs.com/package/@kata-framework/react) — React bindings
- [`@kata-framework/cli`](https://www.npmjs.com/package/@kata-framework/cli) — Build and graph CLI
- [`@kata-framework/lsp`](https://www.npmjs.com/package/@kata-framework/lsp) — Language server (used by this extension)

## License

MIT
