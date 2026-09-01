import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07 has a fail-fast verification superset and dedicated CI migration/smoke gate", () => {
  for (const path of ["scripts/verify-phase-07.mjs", ".github/workflows/phase-07-verification.yml", "docs/verification/phase-07-verification.md"]) {
    assert.equal(existsSync(url(path)), true, `${path} must exist`);
  }
  const verify = read("scripts/verify-phase-07.mjs");
  for (const required of ["test:foundation", "test:unit", "test:cloudflare", "lint", "typecheck", "test:e2e", "build", "vinext:check", "build:vinext", "verify:phase06"]) assert.match(verify, new RegExp(required.replaceAll(":", "\\:")));
  assert.match(verify, /BILLING_PLANS_JSON/);
  assert.match(verify, /XENDIT_WEBHOOK_TOKEN/);
  assert.match(verify, /PUBLIC_APP_ORIGIN/);

  const workflow = read(".github/workflows/phase-07-verification.yml");
  assert.match(workflow, /0004_phase07_billing\.sql/);
  assert.match(workflow, /pnpm verify:phase07/);
  assert.match(workflow, /worker-smoke:/);
  assert.match(workflow, /pnpm --filter @found-calc\/web build:vinext/);
  assert.match(workflow, /scripts\/smoke-phase-07-worker\.sh/);
});

test("Phase 07 supersedes the completed Phase 06 main-PR workflow without duplicate CI", () => {
  const predecessor = read(".github/workflows/phase-06-verification.yml");
  assert.doesNotMatch(predecessor, /\bpull_request\s*:/);
  assert.match(predecessor, /phase-06-goals-projects-profiles-workspace/);
  assert.match(predecessor, /workflow_dispatch\s*:/);
});

test("Phase 07 built Worker smoke exposes deterministic, sanitized runtime checkpoints", () => {
  const path = "scripts/smoke-phase-07-worker.sh";
  assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const smoke = read(path);
  assert.match(smoke, /dist\/server\/wrangler\.json/);
  assert.match(smoke, /--persist-to/);
  for (const checkpoint of ["worker-startup", "anonymous-status", "invalid-webhook", "auth-signup", "authenticated-status"]) {
    assert.match(smoke, new RegExp(checkpoint));
  }
  for (const boundary of ["/api/billing/status", "/api/billing/webhooks/xendit", "/api/auth/sign-up/email"]) {
    assert.match(smoke, new RegExp(boundary.replaceAll("/", "\\/")));
  }
  for (const planId of ["pro-monthly", "pro-annual", "business-monthly", "business-annual"]) {
    assert.match(smoke, new RegExp(planId));
  }
  assert.match(smoke, /::error title=Phase 07 Worker smoke/);
  assert.match(smoke, /REDACTED/);
  assert.match(smoke, /XENDIT_WEBHOOK_TOKEN/);
  assert.match(smoke, /BETTER_AUTH_SECRET/);
  assert.match(smoke, /cookie/i);
  assert.doesNotMatch(smoke, /set -x/);
});

test("Phase 07 Worker smoke retries only the known local Wrangler proxy connection-loss signature", () => {
  const smoke = read("scripts/smoke-phase-07-worker.sh");
  assert.match(smoke, /request_with_miniflare_retry/);
  assert.match(smoke, /is_known_miniflare_connection_loss/);
  assert.match(smoke, /Error: Network connection lost\./);
  assert.match(smoke, /PHASE07_MINIFLARE_RETRY_LIMIT:-3/);
  assert.match(smoke, /PHASE07_MINIFLARE_RETRY_DELAY_SECONDS:-2/);
  assert.match(smoke, /\[\[ "\$status" == "500" \]\]/);
  assert.match(smoke, /grep -Fq 'Error: Network connection lost\.'/);
  assert.doesNotMatch(smoke, /if \[\[ "\$status" == "500" \]\]; then\s*sleep/s);
});

test("Phase 07 Worker smoke restarts Wrangler after the exact fatal Miniflare signature", () => {
  const smoke = read("scripts/smoke-phase-07-worker.sh");
  assert.match(smoke, /start_worker\(\)/);
  assert.match(smoke, /stop_worker\(\)/);
  assert.match(smoke, /restart_worker_after_miniflare_loss\(\)/);
  assert.match(smoke, /restart_worker_after_miniflare_loss/);
  assert.match(smoke, /--persist-to "\$smoke_state"/);
  assert.match(smoke, /restarting local Worker/);
});

test("Phase 07 Worker smoke handles ambiguous signup transport loss without replaying one identity", () => {
  const smoke = read("scripts/smoke-phase-07-worker.sh");
  assert.match(smoke, /signup_with_miniflare_retry/);
  assert.match(smoke, /email="phase07-worker-smoke-\$\{attempt\}@example\.test"/);
  assert.match(smoke, /signup_with_miniflare_retry\s*\nif \[\[ "\$status" != "200" \]\]/);
  assert.match(smoke, /rm -f "\$cookie_jar"/);
});

test("Phase 07 package and local env examples declare only placeholder billing configuration", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["verify:phase07"], "node scripts/verify-phase-07.mjs");
  const vars = read("apps/web/.dev.vars.example");
  for (const key of ["BILLING_PLANS_JSON", "PUBLIC_APP_ORIGIN", "XENDIT_SECRET_API_KEY", "XENDIT_WEBHOOK_TOKEN"]) assert.match(vars, new RegExp(`^${key}=`, "m"));
  assert.doesNotMatch(vars, /xnd_[A-Za-z0-9]{8,}/i);
});

test("Phase 07 historical closure remains reproducible without repackaging successor source", () => {
  const artifactPath = ".github/workflows/phase-07-baseline-artifact.yml";
  assert.equal(existsSync(url(artifactPath)), true, `${artifactPath} must exist`);
  const artifact = read(artifactPath);
  assert.match(artifact, /found-calc-phase-07-billing-entitlements-xendit\.zip/);
  assert.match(artifact, /workflow_dispatch\s*:/);
  assert.doesNotMatch(artifact, /^\s*push\s*:/m);
  assert.match(artifact, /8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4/);
  assert.match(artifact, /git archive/);
  assert.match(artifact, /PHASE07_CANONICAL_SHA/);
  assert.match(artifact, /SHA256SUMS/);
  assert.match(artifact, /ARTIFACT_VERIFICATION\.txt/);
  for (const required of [
    "scripts/smoke-phase-07-worker.sh",
    "apps/web/migrations/0004_phase07_billing.sql",
    "apps/web/src/lib/billing/repository.ts",
    "apps/web/src/lib/xendit/client.ts",
    "apps/web/src/app/api/billing/subscription/change/route.ts",
    "apps/web/tests/e2e/phase-07-billing.spec.ts",
    "tests/foundation/phase-07-commercial-lifecycle.test.mts",
  ]) assert.match(artifact, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  // Historical provenance belongs to immutable closure evidence, not the mutable current BASELINE.md.
  const verification = read("docs/verification/phase-07-verification.md");
  assert.match(verification, /Canonical closure contract/);
  assert.match(verification, /found-calc-phase-07-billing-entitlements-xendit\.zip/);
});
