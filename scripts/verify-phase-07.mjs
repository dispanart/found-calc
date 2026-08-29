import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cleanInheritedBuildArtifacts = () => {
  rmSync(path.join(root, "apps/web/.next"), { recursive: true, force: true });
};

const syntheticBillingPlans = JSON.stringify([{
  id: "ci-fixture",
  displayName: { id: "Fixture CI", en: "CI Fixture" },
  description: { id: "Hanya untuk verifikasi CI", en: "CI verification only" },
  amount: 10000,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount: 1,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements: ["fixture.ci"],
}]);

const verificationEnv = {
  ...process.env,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "phase-07-ci-test-secret-not-for-production-000000000000000000000000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  BETTER_AUTH_ADMIN_USER_IDS: process.env.BETTER_AUTH_ADMIN_USER_IDS ?? "phase-07-ci-admin-bootstrap",
  BILLING_PLANS_JSON: process.env.BILLING_PLANS_JSON ?? syntheticBillingPlans,
  PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN ?? "https://found.example",
  XENDIT_SECRET_API_KEY: process.env.XENDIT_SECRET_API_KEY ?? "phase-07-provider-secret-test-only",
  XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN ?? "phase-07-webhook-token-test-only-000000",
};

const steps = [
  { label: "dependency-free Phase 07 contract tests", command: "pnpm", args: ["test:foundation"] },
  { label: "@found-calc/rules typecheck", command: "pnpm", args: ["--filter", "@found-calc/rules", "typecheck"] },
  { label: "@found-calc/rules tests", command: "pnpm", args: ["--filter", "@found-calc/rules", "test"] },
  { label: "web unit tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:unit"] },
  { label: "Cloudflare D1 billing/workspace/rule/auth tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:cloudflare"] },
  { label: "web lint", command: "pnpm", args: ["--filter", "@found-calc/web", "lint"] },
  { label: "web typecheck", command: "pnpm", args: ["--filter", "@found-calc/web", "typecheck"] },
  { label: "web Playwright", command: "pnpm", args: ["--filter", "@found-calc/web", "test:e2e"] },
  { label: "Next.js production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build"] },
  { label: "vinext compatibility check", command: "pnpm", args: ["--filter", "@found-calc/web", "vinext:check"] },
  { label: "vinext production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build:vinext"] },
  {
    label: "complete Phase 06 regression gate",
    command: "pnpm",
    args: ["verify:phase06"],
    before: cleanInheritedBuildArtifacts,
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
    console.error(`Phase 07 verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 07 verification passed, including the complete Phase 06 regression gate.");
