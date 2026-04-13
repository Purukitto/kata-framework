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
});
