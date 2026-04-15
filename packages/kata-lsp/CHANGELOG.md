# @kata-framework/lsp

## 1.0.0

### Major Changes

- ff1d22d: Stable v1.0.0 release. Diagnostics, completions, hover, go-to-definition, document symbols, and the `WorkspaceIndex` public API are now frozen. Future breaking changes require a new major version.

### Patch Changes

- Updated dependencies [ff1d22d]
  - @kata-framework/core@1.0.0

## 0.2.5

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.8.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.7.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.6.0

## 0.2.2

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.5.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.4.0

## 0.2.0

### Minor Changes

- feat: Initial release — Language Server Protocol for .kata files

  - Workspace indexer with cross-file analysis (unresolved targets, duplicate scene IDs)
  - Diagnostics: leverages kata-core diagnostics + cross-file validation
  - Autocomplete: scene IDs, context variables, asset keys based on cursor context
  - Hover: variable info, asset URLs, scene target resolution
  - Go-to-definition: navigate from `-> @scene/id` to target .kata file
  - Document symbols: outline with scene IDs, speakers, choice labels
  - LSP server entry point for VS Code and other editors

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.3.0
