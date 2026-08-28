import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  { label: "dependency-free foundation tests", command: "pnpm", args: ["test:foundation"] },
  { label: "@found-calc/engine typecheck", command: "pnpm", args: ["--filter", "@found-calc/engine", "typecheck"] },
  { label: "@found-calc/rules typecheck", command: "pnpm", args: ["--filter", "@found-calc/rules", "typecheck"] },
  { label: "@found-calc/engine tests", command: "pnpm", args: ["--filter", "@found-calc/engine", "test"] },
  { label: "@found-calc/rules tests", command: "pnpm", args: ["--filter", "@found-calc/rules", "test"] },
  { label: "complete Phase 01 regression gate", command: "pnpm", args: ["verify:phase01"] },
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
    console.error(`Phase 02 verification stopped at ${step.label} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPhase 02 verification passed, including the complete Phase 01 regression gate.");
