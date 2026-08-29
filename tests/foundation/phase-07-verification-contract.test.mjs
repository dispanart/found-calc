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
  assert.match(workflow, /scripts\/smoke-phase-07-worker\.sh/);
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

test("Phase 07 package and local env examples declare only placeholder billing configuration", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["verify:phase07"], "node scripts/verify-phase-07.mjs");
  const vars = read("apps/web/.dev.vars.example");
  for (const key of ["BILLING_PLANS_JSON", "PUBLIC_APP_ORIGIN", "XENDIT_SECRET_API_KEY", "XENDIT_WEBHOOK_TOKEN"]) assert.match(vars, new RegExp(`^${key}=`, "m"));
  assert.doesNotMatch(vars, /xnd_[A-Za-z0-9]{8,}/i);
});
