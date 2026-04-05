# Plugin Catalog

## Official Plugins

Shipped with `@kata-framework/core` — zero-dependency, tree-shakeable via subpath exports.

| Plugin | Import Path | Description |
|--------|-------------|-------------|
| **Analytics** | `@kata-framework/core/plugins/analytics` | Track scene visits, choice selections, drop-off points, session duration |
| **Profanity Filter** | `@kata-framework/core/plugins/profanity` | Censor text and choice labels with configurable word lists and replacement strategies |
| **Auto-Save** | `@kata-framework/core/plugins/auto-save` | Automatic snapshot saving on scene changes, choices, or timed intervals with slot rotation |
| **Debug Logger** | `@kata-framework/core/plugins/logger` | Structured lifecycle logging with quiet/normal/verbose levels and custom output sinks |
| **Content Warnings** | `@kata-framework/core/plugins/content-warnings` | Tag scenes with warning labels and fire callbacks before entering tagged scenes |

### Validation Utility

```ts
import { validatePlugin } from "@kata-framework/core/plugins/validate";
```

Runtime validation for plugin objects — checks name, hook types, and unknown properties. Used internally by `engine.use()`.

## Community Plugins

Community plugins follow the `kata-plugin-*` naming convention on npm.

| Plugin | npm | Description | Min Version |
|--------|-----|-------------|-------------|
| *Be the first!* | — | — | — |

### Submit a Plugin

To add your plugin to this catalog:

1. Publish to npm with the `kata-plugin-` prefix
2. Ensure `@kata-framework/core` is listed as a `peerDependency`
3. Open a PR adding a row to the Community Plugins table above with:
   - Plugin name (linked to repo)
   - npm package name
   - One-line description
   - Minimum compatible `@kata-framework/core` version

### Creating a Plugin

```bash
bun create kata-plugin my-feature
```

See the [Plugin Authoring Guide](./plugins.md) for full documentation.
