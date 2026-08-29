import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07 adds a separate billing domain and protected route tree", () => {
  const required = [
    "apps/web/migrations/0004_phase07_billing.sql",
    "apps/web/src/lib/billing/contracts.ts",
    "apps/web/src/lib/billing/plans.ts",
    "apps/web/src/lib/billing/entitlements.ts",
    "apps/web/src/lib/billing/repository.ts",
    "apps/web/src/lib/xendit/client.ts",
    "apps/web/src/lib/xendit/webhooks.ts",
    "apps/web/src/app/api/billing/status/route.ts",
    "apps/web/src/app/api/billing/checkout/route.ts",
    "apps/web/src/app/api/billing/subscription/cancel/route.ts",
    "apps/web/src/app/api/billing/subscription/change/route.ts",
    "apps/web/src/app/api/billing/webhooks/xendit/route.ts",
  ];
  for (const path of required) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const migration = read("apps/web/migrations/0004_phase07_billing.sql");
  for (const table of ["billing_customer", "billing_checkout", "billing_subscription", "billing_webhook_inbox"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.doesNotMatch(migration, /ALTER TABLE (calculator_state|rule_version|workspace_)/i);
});

test("Phase 07 keeps provider secrets server-only and engine/rules billing-free", () => {
  const devVars = read("apps/web/.dev.vars.example");
  assert.match(devVars, /XENDIT_SECRET_API_KEY/);
  assert.match(devVars, /XENDIT_WEBHOOK_TOKEN/);
  assert.match(devVars, /BILLING_PLANS_JSON/);
  assert.match(devVars, /PUBLIC_APP_ORIGIN/);
  assert.doesNotMatch(devVars, /xnd_[A-Za-z0-9]/i);

  for (const path of ["packages/engine", "packages/rules"]) {
    for (const sourcePath of [
      `${path}/src/index.ts`,
      ...(path.endsWith("engine") ? [`${path}/src/contracts.ts`] : [`${path}/src/rule-version.ts`]),
    ]) {
      const source = read(sourcePath);
      assert.doesNotMatch(source, /billing|xendit|subscription|entitlement/i);
    }
  }
});

test("Phase 07 status and entitlement paths do not call provider network", () => {
  const entitlements = read("apps/web/src/lib/billing/entitlements.ts");
  const routeServices = read("apps/web/src/lib/billing/route-services.ts");
  assert.doesNotMatch(entitlements, /fetch\s*\(|Xendit/i);
  const statusBody = routeServices.match(/export\s+(?:const|function)\s+getBillingStatus[\s\S]*?(?=export\s+(?:const|function)|$)/)?.[0] ?? routeServices;
  assert.doesNotMatch(statusBody, /createXenditClient|fetch\s*\(/);
});
