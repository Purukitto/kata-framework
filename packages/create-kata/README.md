# create-kata-story-story

Scaffold a new [Kata Framework](https://github.com/purukitto/kata-framework) narrative project.

## Usage

```bash
bun create kata-story my-story
bun create kata-story my-story --template react
bun create kata-story my-story --template multiplayer
```

## Templates

| Template | Description |
|----------|-------------|
| `minimal` | Terminal-based story runner using `@kata-framework/core` only |
| `react` | React 19 app with `KataProvider` and `useKata` hook |
| `multiplayer` | React app with `@kata-framework/sync` for real-time multiplayer |

All templates include sample `.kata` scene files in `scenes/` to get you started.

## Programmatic API

```ts
import { scaffold, validateName, normalizeName, TEMPLATES } from "create-kata-story";

const result = scaffold("my-story", { template: "react" });
// result: { success, dir, projectName, template, error? }
```

## Generated Project Structure

```
my-story/
  scenes/
    intro.kata
    chapter1.kata
    ending.kata
  assets/
  index.ts          # (minimal) or src/index.ts + src/App.tsx (react/multiplayer)
  package.json
  tsconfig.json
  .gitignore
  README.md
```

## License

MIT
