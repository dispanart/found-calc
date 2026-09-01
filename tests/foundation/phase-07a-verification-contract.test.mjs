import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Fresh execution marker for the legacy/current Worker smoke compatibility repair.
const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07A retains its fail-fast superset with branch/manual verification after successor handoff", () => {
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
  assert.match(verify, /Phase 07A web typecheck[^\n]*before:\s*cleanNext/);

  const workflow = read(".github/workflows/phase-07a-verification.yml");
  assert.doesNotMatch(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /phase-07a-commercial-auth-amendment/);
  assert.match(workflow, /workflow_dispatch\s*:/);
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

test("Phase 07 Worker smoke remains compatible with legacy and current Phase 07A offers", () => {
  const smoke = read("scripts/smoke-phase-07-worker.sh");
  for (const offer of [
    "pro-monthly", "pro-annual", "business-monthly", "business-annual",
    "pro-monthly-2026a", "pro-annual-2026a", "business-monthly-2026a", "business-annual-2026a",
  ]) assert.match(smoke, new RegExp(offer));
  assert.match(smoke, /configuredPlanIds/);
  assert.match(smoke, /currentPlanIds\.every/);
  assert.match(smoke, /GOOGLE_CLIENT_SECRET/);
});

test("Phase 07A closure packages the exact merge baseline without rewriting Phase 07 provenance", () => {
  for (const path of [
    "docs/verification/phase-07a-verification.md",
    ".github/workflows/phase-07a-baseline-artifact.yml",
  ]) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const artifact = read(".github/workflows/phase-07a-baseline-artifact.yml");
  assert.match(artifact, /found-calc-phase-07a-commercial-auth-amendment\.zip/);
  assert.match(artifact, /branches:\s*\n\s*- main/);
  assert.match(artifact, /git archive/);
  assert.match(artifact, /\$GITHUB_SHA/);
  assert.match(artifact, /SHA256SUMS/);
  assert.match(artifact, /ARTIFACT_VERIFICATION\.txt/);
  for (const required of [
    "scripts/verify-phase-07a.mjs",
    "apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql",
    "apps/web/src/lib/billing/trial-http.ts",
    "apps/web/src/lib/billing/capabilities.ts",
    "apps/web/src/lib/auth/redirect.ts",
    "apps/web/src/components/billing/pricing-panel.tsx",
    "apps/web/tests/e2e/phase-07a-pricing.spec.ts",
    "tests/foundation/phase-07a-verification-contract.test.mjs",
  ]) assert.match(artifact, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  // Historical closure evidence is immutable even when successor phases advance current handoff docs.
  const verification = read("docs/verification/phase-07a-verification.md");
  assert.match(verification, /found-calc-phase-07a-commercial-auth-amendment\.zip/);
  assert.match(verification, /Canonical Phase 07 predecessor:\*\* `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`/);
  assert.match(verification, /Historical Phase 07 artifact provenance remains pinned to canonical SHA `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`/);

  const historicalArtifact = read(".github/workflows/phase-07-baseline-artifact.yml");
  assert.doesNotMatch(historicalArtifact, /^\s*push\s*:/m);
  assert.match(historicalArtifact, /8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4/);
});
