# @kata-framework/lsp

Language Server Protocol implementation for `.kata` narrative files. Provides real-time diagnostics, autocomplete, hover info, go-to-definition, and document symbols.

## Install

```bash
bun add @kata-framework/lsp
```

## Features

### Diagnostics

- **Parse errors** — invalid YAML frontmatter, broken expressions, malformed directives
- **Undefined variables** — empty `${}` interpolations
- **Invalid conditions** — syntax errors in `cond="..."` expressions
- **Unresolved scene targets** — `-> @scene/id` pointing to nonexistent scenes
- **Duplicate scene IDs** — multiple files defining the same `id`
- **Missing wait duration** — `[wait]` without a number
- **Unclosed exec blocks** — `[exec]` without matching `[/exec]`

### Autocomplete

- Scene IDs after `-> @` (from all workspace `.kata` files)
- Variable names inside `${...}` and `cond="..."` (extracted from `<script>` blocks)
- Asset keys inside `[bg src="..."]` (from frontmatter `assets`)

### Hover

- Variable info on `${path}` — shows whether the variable is defined in any script block
- Asset info on `[bg src="..."]` — shows mapped URL from frontmatter
- Scene info on `-> @scene/id` — shows which file defines the target

### Go-to-Definition

- Jump from `-> @scene/id` to the `.kata` file containing that scene

### Document Symbols

- Outline view with scene ID (module), speaker names (function), and choice labels (property)

## Architecture

The LSP is built as pure handler functions that can be tested without VS Code:

| Module | Purpose |
|--------|---------|
| `src/workspace.ts` | `WorkspaceIndex` — cross-file index of scenes, variables, assets |
| `src/diagnostics.ts` | Per-file + cross-file diagnostic generation |
| `src/completions.ts` | Context-aware completion items |
| `src/hover.ts` | Hover info for variables, assets, scene targets |
| `src/definition.ts` | Go-to-definition for scene targets |
| `src/symbols.ts` | Document symbol extraction |
| `src/server.ts` | LSP server entry point (stdio transport) |

## Usage with VS Code

The `kata-vscode` extension bundles this package and launches it automatically for `.kata` files. No manual configuration needed.

## Usage with Other Editors

The server binary is at `dist/server.js`. Configure your editor's LSP client to launch it:

```bash
# Neovim, Helix, etc.
kata-lsp --stdio
```

Depends on `@kata-framework/core` for parsing and `vscode-languageserver` for the LSP protocol.
