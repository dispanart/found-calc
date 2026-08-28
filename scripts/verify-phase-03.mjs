import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  { label: "dependency-free Phase 03 contract tests", command: "pnpm", args: ["test:foundation"] },
  { label: "@found-calc/catalog typecheck", command: "pnpm", args: ["--filter", "@found-calc/catalog", "typecheck"] },
  { label: "@found-calc/catalog tests", command: "pnpm", args: ["--filter", "@found-calc/catalog", "test"] },
  { label: "web unit tests", command: "pnpm", args: ["--filter", "@found-calc/web", "test:unit"] },
  { label: "complete Phase 02 regression gate", command: "pnpm", args: ["verify:phase02"] },
];

for (const step of steps) {
  process.stdout.write(`\n==> ${step.label}\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(`Unable to start ${step.label}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Phase 03 verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 03 verification passed, including the complete Phase 02 regression gate.");
