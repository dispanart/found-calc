import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Xendit adapter is server-only hosted subscription checkout", () => {
  const client = read("apps/web/src/lib/xendit/client.ts");
  assert.match(client, /session_type:\s*"SUBSCRIPTION"/);
  assert.match(client, /mode:\s*"PAYMENT_LINK"/);
  assert.match(client, /\/sessions/);
  assert.match(client, /\/recurring\/plans\/\$\{encodeURIComponent\(providerPlanId\)\}\/deactivate/);
  assert.match(client, /"api-version":\s*"2026-01-01"/);
  assert.match(client, /authorization/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_XENDIT|PUBLIC_XENDIT/i);
});

test("Xendit webhook parser only normalizes supported recurring lifecycle events", () => {
  const source = read("apps/web/src/lib/xendit/webhooks.ts");
  for (const event of ["recurring.plan.activated", "recurring.plan.inactivated", "recurring.cycle.created", "recurring.cycle.retrying", "recurring.cycle.succeeded", "recurring.cycle.failed", "recurring.cycle.force_attempt_failed"]) {
    assert.match(source, new RegExp(event.replaceAll(".", "\\.")));
  }
  assert.match(source, /data\.plan_id/);
  assert.match(source, /data\.amount/);
  assert.match(source, /data\.currency/);
  assert.doesNotMatch(source, /JSON\.stringify\(value\)|rawPayload|payloadJson/);
});
