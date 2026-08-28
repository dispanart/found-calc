import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readText = (path) => readFile(path, "utf8");

test("Phase 03 verification is a superset of catalog, web, and Phase 02 gates", async () => {
  const [rootPackageText, phase03Script, phase03Workflow] = await Promise.all([
    readText("package.json"),
    readText("scripts/verify-phase-03.mjs"),
    readText(".github/workflows/phase-03-verification.yml"),
  ]);
  const rootPackage = JSON.parse(rootPackageText);

  assert.match(rootPackage.scripts["verify:phase03"], /verify-phase-03\.mjs/);
  assert.match(phase03Script, /@found-calc\/catalog/);
  assert.match(phase03Script, /test:unit/);
  assert.match(phase03Script, /verify:phase02/);
  assert.match(phase03Workflow, /pnpm install --frozen-lockfile/);
  assert.match(phase03Workflow, /playwright install --with-deps chromium/);
  assert.match(phase03Workflow, /pnpm verify:phase03/);

  for (const route of [
    "/id/calculators",
    "/en/calculators",
    "/id/calculators/discount",
    "/id/calculators/business-margin",
    "/id/calculators/synthetic-rule-reference",
  ]) {
    assert.match(phase03Workflow, new RegExp(route.replaceAll("/", "\\/")));
  }
});
