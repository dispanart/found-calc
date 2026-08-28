import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readText = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 02 verification remains a superset of engine, rules, and Phase 01 gates", async () => {
  const [rootPackageText, phase02Script, phase02Workflow] = await Promise.all([
    readText("package.json"),
    readText("scripts/verify-phase-02.mjs"),
    readText(".github/workflows/phase-02-verification.yml"),
  ]);
  const rootPackage = JSON.parse(rootPackageText);

  assert.match(rootPackage.scripts["verify:phase02"], /verify-phase-02\.mjs/);
  assert.match(phase02Script, /@found-calc\/engine/);
  assert.match(phase02Script, /@found-calc\/rules/);
  assert.match(phase02Script, /verify-phase-01\.mjs|verify:phase01/);
  assert.match(phase02Workflow, /pnpm install --frozen-lockfile/);
  assert.match(phase02Workflow, /pnpm verify:phase02/);
  assert.match(phase02Workflow, /playwright install --with-deps chromium/);
  assert.match(phase02Workflow, /127\.0\.0\.1:8787\/id/);
  assert.match(phase02Workflow, /127\.0\.0\.1:8787\/en/);
});
