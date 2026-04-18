import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [],
  noExternal: [
    "@kata-framework/core",
    "@kata-framework/react",
    "react",
    "react-dom",
    "react-dom/client",
  ],
  splitting: false,
  minify: true,
  target: "es2022",
  platform: "browser",
  // gray-matter (transitive via kata-core) calls Buffer.from(string) inside
  // its toBuffer helper to populate file.orig. The result is only stored, not
  // operated on, so a minimal identity shim is enough to keep the bundle alive
  // in browsers without pulling the full `buffer` polyfill.
  banner: {
    js: "globalThis.Buffer ||= { from: (s) => s, isBuffer: () => false };",
  },
});
