import { defineConfig, devices } from "@playwright/test";

const inheritedProcessEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm exec vite dev --host 127.0.0.1 --port 3000",
      env: {
        ...inheritedProcessEnv,
        CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
        FOUNDCALC_EMBED_ORIGIN: "http://localhost:3000",
        FOUNDCALC_WIDGET_LOCAL_PORTS: "3000,3101,3102",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:3000",
      },
      url: "http://127.0.0.1:3000/id",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node --experimental-strip-types tests/e2e/widget-host-server.ts",
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
