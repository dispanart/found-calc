import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "../..",
  test: {
    environment: "node",
    include: [
      "packages/engine/src/**/*.test.ts",
      "packages/rules/src/**/*.test.ts",
    ],
    watch: false,
  },
});
