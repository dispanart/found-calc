import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path: string) => new URL(`../../${path}`, import.meta.url);
const read = (path: string) => readFileSync(url(path), "utf8");

test("billing HTTP boundary protects auth, checkout, cancellation, and webhook identity", () => {
  const http = read("apps/web/src/lib/billing/http.ts");
  assert.match(http, /authentication-required/);
  assert.match(http, /x-callback-token/);
  assert.match(http, /webhook-authentication-failed/);
  assert.match(http, /parsed\.event\.currency\s*!==\s*plan\.currency/);
  assert.match(http, /parsed\.event\.amount\s*!==\s*plan\.amount/);
  assert.match(http, /deactivateSubscription\(subscription\.providerPlanId\)/);
  assert.match(http, /cancellationPending:\s*true/);
  assert.doesNotMatch(http, /request[^\n]*providerPlanId|body\.providerPlanId/);
});

test("billing route handlers stay thin and return no-store failures", () => {
  for (const path of [
    "apps/web/src/app/api/billing/status/route.ts",
    "apps/web/src/app/api/billing/checkout/route.ts",
    "apps/web/src/app/api/billing/subscription/cancel/route.ts",
    "apps/web/src/app/api/billing/webhooks/xendit/route.ts",
  ]) assert.equal(existsSync(url(path)), true, `${path} must exist`);
  const services = read("apps/web/src/lib/billing/route-services.ts");
  assert.match(services, /getBillingStatusRouteServices/);
  assert.match(services, /getBillingWebhookRouteServices/);
  assert.match(services, /Cache-Control":\s*"no-store"/);
});
