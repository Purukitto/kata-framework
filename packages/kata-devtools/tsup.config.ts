import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    react: "react.tsx",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "@kata-framework/core"],
});
