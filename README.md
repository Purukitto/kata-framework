<div align="center">

# Kata Framework

**A headless, media-first narrative engine for modern web apps.**

[![docs](https://img.shields.io/badge/docs-purukitto.com/kata/docs-a78bfa)](https://purukitto.com/kata/docs)
[![npm](https://img.shields.io/npm/v/@kata-framework/core?label=core)](https://www.npmjs.com/package/@kata-framework/core)
[![license](https://img.shields.io/npm/l/@kata-framework/core)](./LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/purukitto/kata-framework/ci.yml?branch=main)](https://github.com/purukitto/kata-framework/actions)

</div>

Kata parses `.kata` scene files, evaluates logic in a sandboxed runtime, and drives any UI framework (React, Vue, vanilla JS) via a predictable typed protocol. **You own the look and feel; Kata owns the story.**

## Get started in 60 seconds

```bash
bun create kata-story my-game
cd my-game
bun dev
```

That's it — you're in a live, branching narrative. From here, [**read the docs →**](https://purukitto.com/kata/docs)

## Packages

| Package | Description |
|---|---|
| [`@kata-framework/core`](./packages/kata-core) · [📖](https://purukitto.com/kata/docs/api/core) | Headless engine — parser, runtime, plugins, VFS, snapshots |
| [`@kata-framework/react`](./packages/kata-react) · [📖](https://purukitto.com/kata/docs/api/react) | React 19 bindings — `KataProvider`, `useKata`, save manager, tween layer |
| [`@kata-framework/sync`](./packages/kata-sync) · [📖](https://purukitto.com/kata/docs/api/sync) | Multiplayer — authority model, transports, `KataServer` |
| [`@kata-framework/cli`](./packages/kata-cli) · [📖](https://purukitto.com/kata/docs/api/cli) | `kata build`, `kata watch`, `kata graph` |
| [`@kata-framework/lsp`](./packages/kata-lsp) · [📖](https://purukitto.com/kata/docs/api/lsp) | Language Server Protocol for `.kata` files |
| [`@kata-framework/test-utils`](./packages/kata-test-utils) · [📖](https://purukitto.com/kata/docs/api/test-utils) | `createTestEngine`, `StoryTestRunner`, `collectFrames` |
| [`@kata-framework/devtools`](./packages/kata-devtools) · [📖](https://purukitto.com/kata/docs/api/devtools) | In-browser devtools plugin + React overlay |
| [`kata-vscode`](./packages/kata-vscode) | VS Code extension — syntax highlighting, LSP, scene graph |
| [`create-kata-story`](./packages/create-kata) | `bun create kata-story` — project scaffolder |
| [`create-kata-plugin`](./packages/create-kata-plugin) | `bun create kata-plugin` — plugin scaffolder |

## Learn more

- [**Documentation**](https://purukitto.com/kata/docs) — getting started, guides, API reference, playground
- [**`.kata` file syntax**](https://purukitto.com/kata/docs/reference/kata-file-syntax)
- [**KSON protocol**](https://purukitto.com/kata/docs/reference/kson-protocol)
- [**Plugin catalog**](https://purukitto.com/kata/docs/guides/plugins-catalog)
- [**Multiplayer guide**](https://purukitto.com/kata/docs/guides/multiplayer)
- [**Roadmap**](./ROADMAP.md)
- [**Changelog**](./CHANGELOG.md)

## Contributing

This is a Bun workspace monorepo. Use Bun for everything — `npm`, `pnpm`, `yarn`, `node`, and `vite` are not supported.

```bash
bun install
bun test            # run all tests
bun run build       # build all packages
bun run changeset   # create a changeset
```

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture guide and development conventions.

## License

MIT © [Purukitto](https://purukitto.com)
