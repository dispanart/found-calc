import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  {
    label: "dependency-free foundation tests",
    command: process.execPath,
    args: [
      "--experimental-strip-types",
      "--test",
      "apps/web/tests/foundation/*.test.m*",
      "tests/foundation/*.test.mjs",
    ],
    shell: true,
  },
  { label: "lint", command: "pnpm", args: ["--filter", "@found-calc/web", "lint"] },
  { label: "typecheck", command: "pnpm", args: ["--filter", "@found-calc/web", "typecheck"] },
  { label: "test:unit", command: "pnpm", args: ["--filter", "@found-calc/web", "test:unit"] },
  {
    label: "test:cloudflare",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "test:cloudflare"],
  },
  { label: "test:e2e", command: "pnpm", args: ["--filter", "@found-calc/web", "test:e2e"] },
  { label: "build", command: "pnpm", args: ["--filter", "@found-calc/web", "build"] },
  {
    label: "vinext:check",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "vinext:check"],
  },
  {
    label: "build:vinext",
    command: "pnpm",
    args: ["--filter", "@found-calc/web", "build:vinext"],
  },
];

for (const step of steps) {
  process.stdout.write(`\n==> ${step.label}\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: "inherit",
    shell: step.shell ?? process.platform === "win32",
  });

  if (result.error) {
    console.error(`Unable to start ${step.label}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Phase 01 verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 01 verification passed.");
