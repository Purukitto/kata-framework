# Kata Framework

**A Headless, Media-First Narrative Engine for Modern Web Apps.**

Kata Framework is a headless runtime for interactive narrative: parse `.kata` scene files, run logic and conditionals, and drive any UI (React, Vue, or vanilla) via a simple protocol. You own the look and feel; Kata owns the story state and flow.

---

## Architecture

The project is a **monorepo** (Bun workspaces) with two main packages:

| Package        | Role |
|----------------|------|
| **kata-core**  | Pure engine: no React, no DOM. Parses `.kata` files into KSON, evaluates conditions and variables, emits frames. Use it in Node, Bun, or any bundler. |
| **kata-react** | React bindings: `<KataProvider>`, `useKata()` hook, and optional debug UI. Depends on `kata-core` and is the reference integration. |

```
kata-framework/
├── packages/
│   ├── kata-core/    # Parser, runtime, evaluator, types
│   └── kata-react/   # Provider, useKata, KataDebug
├── package.json      # Workspace root
└── README.md
```

Additional packages (e.g. examples, tooling) may live under `packages/` or `examples/` as the project grows.

---

## Key Features

- **KSON protocol** — Scenes compile to a simple JSON-like structure (meta, actions, frames). The engine emits **KSONFrame** objects; your UI renders from that contract alone.
- **Zod & type-safety** — TypeScript types and Zod (in the stack) for reliable parsing and runtime validation.
- **Headless runtime** — No built-in UI. Use the engine in React, Vue, Svelte, or plain JS; plug in your own components and styling.
- **Mod support (planned)** — Design goal: load third-party `.kata` modules and assets without touching core code.

---

## Quick Start

From the repo root:

```bash
bun install
bun test
```

- **Run only core tests:** `cd packages/kata-core && bun test`
- **Run only React tests:** `cd packages/kata-react && bun test`

See **packages/kata-core/README.md** for engine usage and **packages/kata-react/README.md** for React setup and the `useKata()` hook.
