import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "index.ts",
    "src/plugins/analytics.ts",
    "src/plugins/profanity.ts",
    "src/plugins/auto-save.ts",
    "src/plugins/logger.ts",
    "src/plugins/content-warnings.ts",
    "src/plugins/validate.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
});
