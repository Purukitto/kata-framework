# Kata Framework

**A Headless, Media-First Narrative Engine for Modern Web Apps.**

Kata Framework is a headless runtime designed for creating interactive narratives, visual novels, and text adventures. It parses `.kata` scene files, strictly evaluates logic and conditionals, and drives any UI framework (React, Vue, or vanilla JS) via a predictable protocol. 

**You own the look and feel; Kata owns the story state and flow.**

---

## ⚡ Quick Start

Kata Framework packages are published to npm under the `@kata-framework` scope.

### 1. Installation

**Using Bun (Recommended):**
```bash
bun add @kata-framework/core @kata-framework/react
```

**Using npm:**
```bash
npm install @kata-framework/core @kata-framework/react
```

> **Note:** If you are building a UI with React, you will need both `@kata-framework/core` and `@kata-framework/react`. If you are building a UI with another framework (like Vue or Svelte), you only need `@kata-framework/core`.

### 2. The `.kata` File Syntax

A `.kata` narrative file is designed to be highly readable for writers, while remaining powerful for developers. It consists of three parts:

1. **Frontmatter**: A YAML block setting configuration like `id`, `assets`, and `layout`.
2. **Logic**: A `<script>` tag with TypeScript to run logic safely in an isolated context.
3. **Narrative**: The story content written in a markdown-like syntax using directives, choices, and conditional blocks (e.g., `:::if{cond="..."} ... :::`).

---

## 📦 Packages & Documentation

Kata is built as a modular monorepo. Detailed API documentation for each package can be found in their respective directories:

| Package | Version | Description |
|---------|---------|-------------|
| [`@kata-framework/core`](./packages/kata-core) | *(npm)* | The pure, headless engine. Parses `.kata` files, evaluates conditions safely, and emits state frames. |
| [`@kata-framework/react`](./packages/kata-react) | *(npm)* | React 19 bindings (`<KataProvider>` and `useKata()` hook) to easily connect the engine to your UI. |

---

## 🛠️ Key Features

- **Headless runtime** — Zero built-in UI components. Bring your own components, styling, and animations.
- **KSON protocol** — The engine compiles `.kata` files into a strict JSON-like structure (meta, actions, frames). Your UI renders from this reliable contract alone.
- **Secure Evaluation** — Logic inside `.kata` scripts is parsed securely. We never use `eval()`.
- **Zod & Type-Safety** — Built from the ground up with strict TypeScript types and Zod validation.
- **Mod Support (Planned)** — Designed to safely load third-party `.kata` modules and assets dynamically.

---

## 🤝 Contributing & Development

We welcome contributions! Kata Framework uses [Bun](https://bun.sh/) for package management and [Changesets](https://github.com/changesets/changesets) for release versioning.

To set up the project locally:

```bash
# Install dependencies
bun install

# Build the packages using tsup
bun run build

# Run the test suites
bun test
```

### Creating PRs

When submitting a Pull Request that modifies the public api of `@kata-framework/core` or `@kata-framework/react`, please generate a changeset:

```bash
bun run changeset
```
