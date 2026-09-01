import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cleanNext = () => rmSync(path.join(root, "apps/web/.next"), { recursive: true, force: true });

const verificationEnv = {
  ...process.env,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "phase-07b-verification-secret-not-for-production-000000000000000000000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  CLOUDFLARE_INCLUDE_PROCESS_ENV: process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV ?? "true",
  FOUNDCALC_EMBED_ORIGIN: process.env.FOUNDCALC_EMBED_ORIGIN ?? "http://localhost:8787",
  FOUNDCALC_WIDGET_LOCAL_PORTS: process.env.FOUNDCALC_WIDGET_LOCAL_PORTS ?? "3000,3101,3102",
  PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN ?? "http://127.0.0.1:3000",
};

const steps = [
  {
    label: "canonical Phase 07A regression gate",
    command: "pnpm",
    args: ["verify:phase07a"],
  },
  {
    label: "Phase 07B foundation contracts",
    command: "pnpm",
    args: ["test:foundation"],
  },
  {
    label: "Phase 07B web unit tests",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "test:unit"],
  },
  {
    label: "Phase 07B Cloudflare tests",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "test:cloudflare"],
  },
  {
    label: "Phase 07B lint",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "lint"],
  },
  {
    label: "Phase 07B typecheck",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "typecheck"],
    before: cleanNext,
  },
  {
    label: "Phase 07B full Playwright regression",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "test:e2e"],
  },
  {
    label: "Phase 07B deterministic widget browser repeat",
    command: "pnpm",
    args: [
      "--filter",
      "@found-calc/web",
      "exec",
      "playwright",
      "test",
      "tests/e2e/phase-07b-widget-runtime.spec.ts",
      "tests/e2e/phase-07b-widget-accessibility.spec.ts",
      "--retries=0",
      "--repeat-each=2",
    ],
  },
  {
    label: "Phase 07B Next build",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "build"],
  },
  {
    label: "Phase 07B vinext compatibility check",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "vinext:check"],
    before: cleanNext,
  },
  {
    label: "Phase 07B vinext production build",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "build:vinext"],
  },
  {
    label: "Phase 07B Worker smoke",
    command: "bash",
    args: ["scripts/smoke-phase-07b-worker.sh"],
  },
];

for (const step of steps) {
  process.stdout.write(`\n==> ${step.label}\n`);
  step.before?.();
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: verificationEnv,
  });
  if (result.error) {
    console.error(`Unable to start ${step.label}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Phase 07B verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log(
  "\nPhase 07B verification passed, including the complete Phase 07A gate, widget browser repeat, production builds, and Worker smoke.",
);
