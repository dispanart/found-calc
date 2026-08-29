import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("billing plan configuration remains server-validated and fail-closed", () => {
  const contracts = read("apps/web/src/lib/billing/contracts.ts");
  const plans = read("apps/web/src/lib/billing/plans.ts");
  const entitlements = read("apps/web/src/lib/billing/entitlements.ts");
  assert.match(contracts, /"pending"\s*\|\s*"active"\s*\|\s*"past_due"\s*\|\s*"inactive"/);
  assert.match(plans, /BILLING|billing-unavailable|parseBillingPlansJson/);
  assert.match(plans, /billingDay[^\n]*number|billing day must be an integer from 1 through 28/i);
  assert.match(plans, /currency\s*!==\s*"IDR"/);
  assert.match(plans, /country\s*!==\s*"ID"/);
  assert.match(plans, /interval\s*!==\s*"MONTH"/);
  assert.match(entitlements, /status\s*===\s*"active"/);
  assert.doesNotMatch(entitlements, /fetch\s*\(|Xendit/i);
});
