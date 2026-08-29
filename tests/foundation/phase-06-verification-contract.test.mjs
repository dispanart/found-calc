import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 06 verification is a Phase 05 regression superset", () => {
  const root = JSON.parse(read("package.json"));
  assert.equal(root.scripts["verify:phase06"], "node scripts/verify-phase-06.mjs");
  assert.equal(existsSync(url("scripts/verify-phase-06.mjs")), true);
  const script = read("scripts/verify-phase-06.mjs");
  assert.match(script, /test:foundation/);
  assert.match(script, /test:cloudflare/);
  assert.match(script, /test:e2e/);
  assert.match(script, /vinext:check/);
  assert.match(script, /build:vinext/);
  assert.match(script, /verify:phase05/);
});

test("Phase 06 owns main PR verification and applies the full D1 migration chain", () => {
  const workflowPath = ".github/workflows/phase-06-verification.yml";
  assert.equal(existsSync(url(workflowPath)), true, `${workflowPath} must exist`);
  const workflow = read(workflowPath);
  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /phase-06-goals-projects-profiles-workspace/);
  for (const migration of [
    "0001_phase04_auth_and_calculator_state.sql",
    "0002_phase05_rule_platform_admin.sql",
    "0003_phase06_workspace.sql",
  ]) assert.match(workflow, new RegExp(migration.replaceAll(".", "\\.")));
  assert.match(workflow, /pnpm verify:phase06/);
  assert.match(workflow, /api\/workspace\/projects/);
  assert.match(workflow, /api\/auth\/sign-up\/email/);
  assert.match(workflow, /api\/workspace\/profile/);
  assert.match(workflow, /cookie_jar/);
  assert.match(workflow, /api\/rules\/reference\.synthetic-rate\/versions/);
});

test("closed Phase 05 workflow no longer duplicates main PR verification", () => {
  const workflow = read(".github/workflows/phase-05-verification.yml");
  assert.doesNotMatch(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
});

test("Phase 06 built Worker smoke uses one isolated state with all three migrations", () => {
  const workflow = read(".github/workflows/phase-06-verification.yml");
  assert.match(workflow, /smoke_state=.*RUNNER_TEMP/);
  assert.match(workflow, /rm -rf "\$smoke_state"/);
  assert.equal((workflow.match(/--persist-to "\$smoke_state"/g) ?? []).length, 4);
  assert.doesNotMatch(workflow, /000[123][^\n]*\|\| true/);
});

test("Phase 06 built Worker smoke validates the owned/shared project collection contract", () => {
  const workflow = read(".github/workflows/phase-06-verification.yml");

  assert.doesNotMatch(workflow, /grep -Fq '\"projects\":\[\]'/);
  assert.match(workflow, /JSON\.parse/);
  assert.match(workflow, /projects\.owned/);
  assert.match(workflow, /projects\.shared/);
});
