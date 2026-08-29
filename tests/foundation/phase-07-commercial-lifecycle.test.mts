import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path: string) => new URL(`../../${path}`, import.meta.url);
const read = (path: string) => readFileSync(url(path), "utf8");

test("Phase 07 pins the approved Found Calc V1 paid offers including annual billing", () => {
  const plans = read("apps/web/src/lib/billing/plans.ts");
  for (const [id, amount, intervalCount] of [
    ["pro-monthly", 25_000, 1],
    ["pro-annual", 250_000, 12],
    ["business-monthly", 75_000, 1],
    ["business-annual", 750_000, 12],
  ] as const) {
    assert.match(plans, new RegExp(id));
    assert.match(plans, new RegExp(String(amount)));
    assert.match(plans, new RegExp(`intervalCount[^\\n]*${intervalCount}|${intervalCount}[^\\n]*intervalCount`));
  }
  assert.match(plans, /required|canonical|offer/i);
});

test("Phase 07 has first-party pending plan-change state and a protected change route", () => {
  assert.equal(existsSync(url("apps/web/src/app/api/billing/subscription/change/route.ts")), true);
  const migration = read("apps/web/migrations/0004_phase07_billing.sql");
  assert.match(migration, /pending_plan_id/);
  assert.match(migration, /pending_plan_change_requested_at/);

  const repository = read("apps/web/src/lib/billing/repository.ts");
  assert.match(repository, /stagePlanChange/);
  assert.match(repository, /clearPlanChange/);
  assert.match(repository, /confirmedPlanId/);

  const http = read("apps/web/src/lib/billing/http.ts");
  assert.match(http, /handleBillingChangeRequest/);
  assert.match(http, /updateSubscriptionPlan/);
  assert.match(http, /recurring\.cycle\.succeeded/);
});

test("Phase 07 UI distinguishes monthly and annual offers and supports server-confirmed plan changes", () => {
  const client = read("apps/web/src/lib/billing/client.ts");
  const panel = read("apps/web/src/components/billing/billing-panel.tsx");
  assert.match(client, /changeBillingSubscription/);
  assert.match(panel, /perYear|per tahun/);
  assert.match(panel, /changePlan|Ganti plan|Change plan/);
  assert.match(panel, /Rp0|Free/);
});
