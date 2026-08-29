import assert from "node:assert/strict";
import { test } from "node:test";

import { createXenditClient } from "../../apps/web/src/lib/xendit/client.ts";

const responseBody = {
  payment_session_id: "ps_fixture",
  recurring_plan_id: "repl_fixture",
  reference_id: "fcbillingfixture",
  payment_link_url: "https://checkout.xendit.co/sessions/ps_fixture",
};

test("hosted subscription omits total_recurrence for indefinite plans", async () => {
  let body: Record<string, unknown> | null = null;
  const client = createXenditClient({
    secretApiKey: "xnd_development_fixture",
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.createSubscriptionSession({
    referenceId: "fcbillingfixture",
    customerReferenceId: "fcuserfixture",
    customerGivenNames: "Fixture",
    customerEmail: "fixture@example.test",
    amount: 10_000,
    currency: "IDR",
    country: "ID",
    locale: "id",
    description: "Fixture subscription",
    interval: "MONTH",
    intervalCount: 1,
    totalRecurrence: null,
    anchorDate: "2026-09-15T00:00:00.000+07:00",
    failedCycleAction: "RESUME",
    successReturnUrl: "https://found.example/id/workspace/billing?checkout=returned",
    cancelReturnUrl: "https://found.example/id/workspace/billing?checkout=cancelled",
  });

  assert.ok(body);
  const subscription = body.subscription as Record<string, unknown>;
  const schedule = subscription.schedule as Record<string, unknown>;
  assert.equal(Object.hasOwn(schedule, "total_recurrence"), false);
});


test("plan change uses current subscription update API without a second hosted checkout", async () => {
  let path = "";
  let method = "";
  let apiVersion = "";
  let body: Record<string, unknown> | null = null;
  const client = createXenditClient({
    secretApiKey: "xnd_development_fixture",
    baseUrl: "https://api.example.test",
    fetchImpl: async (input, init) => {
      path = String(input);
      method = String(init?.method);
      apiVersion = new Headers(init?.headers).get("api-version") ?? "";
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: "repl_fixture", status: "ACTIVE" }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  await client.updateSubscriptionPlan("repl_fixture", {
    amount: 250_000,
    interval: "MONTH",
    intervalCount: 12,
    totalRecurrence: null,
    failedCycleAction: "RESUME",
    description: "Pro annual",
  });

  assert.equal(path, "https://api.example.test/recurring/plans/repl_fixture");
  assert.equal(method, "PATCH");
  assert.equal(apiVersion, "2026-01-01");
  assert.ok(body);
  assert.equal(body.amount, 250_000);
  const schedule = body.schedule as Record<string, unknown>;
  assert.equal(schedule.interval, "MONTH");
  assert.equal(schedule.interval_count, 12);
  assert.equal(Object.hasOwn(schedule, "total_recurrence"), false);
});
