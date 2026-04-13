# @kata-framework/docs-playground

Internal package. Not published to npm.

An embeddable `.kata` playground widget used by the Kata documentation site. Bundles `@kata-framework/core`, `@kata-framework/react`, and the React runtime into a single ESM file so the docs site can drop it in without any React integration of its own.

## Public API

```ts
import { mount, autoMountAll } from "@kata-framework/docs-playground";

const handle = mount(document.querySelector("#play")!, {
  scene: `---
id: hello
---
:: Narrator :: Hi!`,
});

handle.setScene(newSource);
handle.reset();
handle.unmount();
```

`autoMountAll()` walks `[data-playground]` elements and lazy-mounts each one on intersection.

## Consumption

The documentation site's sync script (`scripts/sync-docs-to-web.ts` in the repo root) copies `dist/index.js` into `../purukitto-web/public/kata-playground/kata-playground.js`. The site imports it dynamically on scroll.
