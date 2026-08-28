import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cleanInheritedBuildArtifacts = () => {
  rmSync(path.join(root, "apps/web/.next"), { recursive: true, force: true });
};

const steps = [
  { label: "dependency-free Phase 04 contract tests", command: "pnpm", args: ["test:foundation"] },
  { label: "web unit tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:unit"] },
  { label: "Cloudflare D1/auth persistence tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:cloudflare"] },
  { label: "web lint", command: "pnpm", args: ["--filter", "@found-calc/web", "lint"] },
  { label: "web typecheck", command: "pnpm", args: ["--filter", "@found-calc/web", "typecheck"] },
  { label: "web Playwright", command: "pnpm", args: ["--filter", "@found-calc/web", "test:e2e"] },
  { label: "Next.js production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build"] },
  { label: "vinext compatibility check", command: "pnpm", args: ["--filter", "@found-calc/web", "vinext:check"] },
  { label: "vinext production build", command: "pnpm", args: ["--filter", "@found-calc/web", "build:vinext"] },
  {
    label: "complete Phase 03 regression gate",
    command: "pnpm",
    args: ["verify:phase03"],
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
    env: {
      ...process.env,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "phase-04-ci-test-secret-not-for-production-000000000000000000000000",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
    },
  });

  if (result.error) {
    console.error(`Unable to start ${step.label}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Phase 04 verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 04 verification passed, including the complete Phase 03 regression gate.");
