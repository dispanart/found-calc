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

test("Phase 05 CI keeps its completed phase branch verification and migration coverage", () => {
  const workflowPath = ".github/workflows/phase-05-verification.yml";
  assert.equal(existsSync(url(workflowPath)), true, `${workflowPath} must exist`);
  const workflow = read(workflowPath);
  assert.match(workflow, /phase-05-versioned-rule-platform-admin-core/);
  assert.match(workflow, /0001_phase04_auth_and_calculator_state\.sql/);
  assert.match(workflow, /0002_phase05_rule_platform_admin\.sql/);
  assert.match(workflow, /BETTER_AUTH_ADMIN_USER_IDS/);
  assert.match(workflow, /pnpm verify:phase05/);
  assert.match(workflow, /api\/rules\/reference\.synthetic-rate\/versions/);
  assert.match(workflow, /api\/admin\/rule-versions/);
});

test("Phase 05 built Worker smoke uses one fresh isolated D1 persistence state", () => {
  const workflow = read(".github/workflows/phase-05-verification.yml");
  assert.match(workflow, /smoke_state=.*RUNNER_TEMP/);
  assert.match(workflow, /rm -rf \"\$smoke_state\"/);
  assert.equal((workflow.match(/--persist-to \"\$smoke_state\"/g) ?? []).length, 3);
  assert.doesNotMatch(workflow, /000[12][^\n]*\|\| true/);
});

test("Phase 05 historical closure evidence remains portable after successor baselines advance", () => {
  const verificationPath = "docs/verification/phase-05-verification.md";
  const workflowPath = ".github/workflows/phase-05-baseline-artifact.yml";

  assert.equal(existsSync(url(verificationPath)), true, `${verificationPath} must exist`);
  const verification = read(verificationPath);
  assert.match(verification, /\*\*Phase:\*\* 05 — Versioned Rule Platform \+ Admin Core/);
  assert.match(verification, /33232447867/);
  assert.match(verification, /eb67641aeb47222f44258251c2caea93b6809b7f/);
  assert.match(verification, /found-calc-phase-05-versioned-rule-platform-admin-core\.zip/);

  assert.equal(existsSync(url(workflowPath)), true, `${workflowPath} must exist`);
  const workflow = read(workflowPath);
  assert.match(workflow, /found-calc-phase-05-versioned-rule-platform-admin-core\.zip/);
  assert.match(workflow, /git archive --format=zip --output="\$ARTIFACT" "\$GITHUB_SHA"/);
  assert.match(workflow, /SHA256SUMS/);
  assert.match(workflow, /ARTIFACT_VERIFICATION\.txt/);
});

test("Phase 05 canonical artifact trigger cannot interfere with later phase handoffs", () => {
  const workflow = read(".github/workflows/phase-05-baseline-artifact.yml");
  assert.doesNotMatch(workflow, /^\s{6}-\s+BASELINE\.md\s*$/m);
  assert.doesNotMatch(workflow, /^\s{6}-\s+PHASE_HANDOFF\.md\s*$/m);
  assert.doesNotMatch(workflow, /^\s{6}-\s+PHASE_CHAT_TEMPLATE\.md\s*$/m);
  assert.match(workflow, /docs\/verification\/phase-05-verification\.md/);
  assert.match(workflow, /\.github\/workflows\/phase-05-baseline-artifact\.yml/);
});