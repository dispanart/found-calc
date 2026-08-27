import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["tests/cloudflare/**", "tests/e2e/**"],
  },
});
