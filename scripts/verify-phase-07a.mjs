import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cleanNext = () => rmSync(path.join(root, "apps/web/.next"), { recursive: true, force: true });

const syntheticBillingPlans = JSON.stringify([
  { id: "pro-monthly", displayName: { id: "Pro", en: "Pro" }, description: { id: "Konfigurasi verifikasi Pro", en: "Pro verification configuration" }, amount: 25000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth"] },
  { id: "pro-annual", displayName: { id: "Pro", en: "Pro" }, description: { id: "Konfigurasi verifikasi Pro", en: "Pro verification configuration" }, amount: 250000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 12, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth"] },
  { id: "business-monthly", displayName: { id: "Business", en: "Business" }, description: { id: "Konfigurasi verifikasi Business", en: "Business verification configuration" }, amount: 75000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth", "bulk_sku", "export", "team_access"] },
  { id: "business-annual", displayName: { id: "Business", en: "Business" }, description: { id: "Konfigurasi verifikasi Business", en: "Business verification configuration" }, amount: 750000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 12, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth", "bulk_sku", "export", "team_access"] },
  { id: "pro-monthly-2026a", displayName: { id: "Besties", en: "Besties" }, description: { id: "Besties bulanan", en: "Monthly Besties" }, amount: 24900, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth"] },
  { id: "pro-annual-2026a", displayName: { id: "Besties", en: "Besties" }, description: { id: "Besties tahunan", en: "Annual Besties" }, amount: 199000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 12, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth"] },
  { id: "business-monthly-2026a", displayName: { id: "Family", en: "Family" }, description: { id: "Family bulanan", en: "Monthly Family" }, amount: 59000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth", "bulk_sku", "export", "team_access"] },
  { id: "business-annual-2026a", displayName: { id: "Family", en: "Family" }, description: { id: "Family tahunan", en: "Annual Family" }, amount: 499000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 12, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["advanced_scenarios", "history_depth", "bulk_sku", "export", "team_access"] },
]);

const verificationEnv = {
  ...process.env,
  BILLING_PLANS_JSON: process.env.BILLING_PLANS_JSON ?? syntheticBillingPlans,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "phase-07a-google-client-id-placeholder",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "phase-07a-google-client-secret-placeholder",
};

const steps = [
  { label: "complete inherited Phase 07 regression gate", command: "pnpm", args: ["verify:phase07"] },
  { label: "Phase 07A foundation contracts", command: "pnpm", args: ["test:foundation"] },
  { label: "Phase 07A commercial/billing/auth/workspace unit tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:unit"] },
  { label: "Phase 07A Cloudflare D1 integration tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:cloudflare"] },
  { label: "Phase 07A web lint", command: "pnpm", args: ["--filter", "@found-calc/web", "lint"] },
  { label: "Phase 07A web typecheck", command: "pnpm", args: ["--filter", "@found-calc/web", "typecheck"] },
  { label: "Phase 07A Playwright", command: "pnpm", args: ["--filter", "@found-calc/web", "test:e2e"] },
  { label: "Phase 07A Next production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build"] },
  { label: "Phase 07A vinext compatibility check", command: "pnpm", args: ["--filter", "@found-calc/web", "vinext:check"], before: cleanNext },
  { label: "Phase 07A vinext production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build:vinext"] },
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
    console.error(`Phase 07A verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 07A verification passed, including the complete Phase 07 regression gate and Phase 07A-specific verification.");
