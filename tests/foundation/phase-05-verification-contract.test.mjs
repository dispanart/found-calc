import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 05 verification gate is wired as a Phase 04 regression superset", () => {
  const root = JSON.parse(read("package.json"));
  assert.equal(root.scripts["verify:phase05"], "node scripts/verify-phase-05.mjs");
  assert.equal(existsSync(url("scripts/verify-phase-05.mjs")), true);
  const script = read("scripts/verify-phase-05.mjs");
  assert.match(script, /test:foundation/);
  assert.match(script, /@found-calc\/rules/);
  assert.match(script, /test:cloudflare/);
  assert.match(script, /test:e2e/);
  assert.match(script, /vinext:check/);
  assert.match(script, /build:vinext/);
  assert.match(script, /verify:phase04/);
});

test("Phase 05 CI applies both local migrations and owns main PR verification", () => {
  const workflowPath = ".github/workflows/phase-05-verification.yml";
  assert.equal(existsSync(url(workflowPath)), true, `${workflowPath} must exist`);
  const workflow = read(workflowPath);
  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /0001_phase04_auth_and_calculator_state\.sql/);
  assert.match(workflow, /0002_phase05_rule_platform_admin\.sql/);
  assert.match(workflow, /BETTER_AUTH_ADMIN_USER_IDS/);
  assert.match(workflow, /pnpm verify:phase05/);
  assert.match(workflow, /api\/rules\/reference\.synthetic-rate\/versions/);
  assert.match(workflow, /api\/admin\/rule-versions/);
});
