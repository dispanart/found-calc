import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07A owns a fail-fast verification superset and main PR CI", () => {
  for (const path of ["scripts/verify-phase-07a.mjs", ".github/workflows/phase-07a-verification.yml"]) {
    assert.equal(existsSync(url(path)), true, `${path} must exist`);
  }

  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["verify:phase07a"], "node scripts/verify-phase-07a.mjs");

  const verify = read("scripts/verify-phase-07a.mjs");
  for (const required of ["verify:phase07", "test:foundation", "test:unit", "test:cloudflare", "lint", "typecheck", "test:e2e", "build", "vinext:check", "build:vinext"]) {
    assert.match(verify, new RegExp(required.replaceAll(":", "\\:")));
  }
  for (const offer of ["pro-monthly", "pro-annual", "business-monthly", "business-annual", "pro-monthly-2026a", "pro-annual-2026a", "business-monthly-2026a", "business-annual-2026a"]) {
    assert.match(verify, new RegExp(offer));
  }
  assert.match(verify, /GOOGLE_CLIENT_ID/);
  assert.match(verify, /GOOGLE_CLIENT_SECRET/);
  assert.doesNotMatch(verify, /AIza[0-9A-Za-z_-]{20,}/);

  const workflow = read(".github/workflows/phase-07a-verification.yml");
  assert.match(workflow, /pull_request\s*:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(workflow, /^\s*push\s*:/m);
  for (const migration of ["0001_phase04_auth_and_calculator_state.sql", "0002_phase05_rule_platform_admin.sql", "0003_phase06_workspace.sql", "0004_phase07_billing.sql", "0005_phase07a_commercial_auth_amendment.sql"]) {
    assert.match(workflow, new RegExp(migration.replaceAll(".", "\\.")));
  }
  assert.match(workflow, /pnpm verify:phase07a/);
  assert.match(workflow, /worker-smoke:/);
  assert.match(workflow, /scripts\/smoke-phase-07-worker\.sh/);
  assert.match(workflow, /GOOGLE_CLIENT_ID/);
  assert.match(workflow, /GOOGLE_CLIENT_SECRET/);

  const predecessor = read(".github/workflows/phase-07-verification.yml");
  assert.doesNotMatch(predecessor, /\bpull_request\s*:/);
  assert.match(predecessor, /phase-07-billing-entitlements-xendit/);
  assert.match(predecessor, /workflow_dispatch\s*:/);
});

test("Phase 07A verification keeps Google credentials non-secret placeholders and applies only additive migration 0005", () => {
  const vars = read("apps/web/.dev.vars.example");
  assert.match(vars, /^GOOGLE_CLIENT_ID=$/m);
  assert.match(vars, /^GOOGLE_CLIENT_SECRET=$/m);
  assert.doesNotMatch(vars, /AIza[0-9A-Za-z_-]{20,}/);
  const migration = read("apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql");
  assert.match(migration, /billing_trial/);
  assert.match(migration, /paid_through_at/);
});