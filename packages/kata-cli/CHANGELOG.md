# @kata-framework/cli

## 1.0.0

### Major Changes

- ff1d22d: Stable v1.0.0 release. The `kata` CLI's commands (`build`, `watch`, `graph`), flags, and `kata.config.json` schema are now frozen under semver. Future breaking changes require a new major version.

### Patch Changes

- Updated dependencies [ff1d22d]
  - @kata-framework/core@1.0.0

## 0.1.3

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.8.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.7.0

## 0.1.1

### Patch Changes

- Updated dependencies
  - @kata-framework/core@0.6.0

## 0.1.0

### Minor Changes

- Initial versioned release of the CLI tool.

  Includes three commands: `kata build` (parse .kata → .kson.json), `kata watch` (build + watch), and `kata graph` (scene graph visualization with DOT/JSON output and --lint for orphans/dead ends).
