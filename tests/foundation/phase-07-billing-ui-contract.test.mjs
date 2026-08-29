import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07 exposes localized workspace billing without generic dashboard primitives", () => {
  for (const path of [
    "apps/web/src/lib/billing/client.ts",
    "apps/web/src/components/billing/billing-panel.tsx",
    "apps/web/src/app/[locale]/(workspace)/workspace/billing/page.tsx",
  ]) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const panel = read("apps/web/src/components/billing/billing-panel.tsx");
  assert.match(panel, /checkout.*Xendit|Xendit.*checkout/i);
  assert.match(panel, /aria-live|role="status"/);
  assert.match(panel, /390|break-words|min-w-0|overflow-wrap/);
  assert.doesNotMatch(panel, /grid-cols-4|KPI|metric-card|dashboard-card|CardHeader|CardContent/i);

  const page = read("apps/web/src/app/[locale]/(workspace)/workspace/billing/page.tsx");
  assert.match(page, /Phase 07/);
  assert.match(page, /BillingPanel/);
});

test("Phase 07 browser coverage exercises product-specific billing lifecycle and keyboard checkout", () => {
  const e2e = read("apps/web/tests/e2e/phase-07-billing.spec.ts");
  for (const expected of [
    "Menunggu konfirmasi",
    "Payment needs attention",
    "Subscription inactive",
    "Cancellation has been requested",
    "Continue to Xendit",
    "provider-unavailable",
    "toBeFocused",
    "390",
  ]) assert.match(e2e, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(e2e, /postDataJSON\(\).*planId.*locale/s);
});

test("billing navigation is available in both locales", () => {
  const messages = read("apps/web/src/i18n/messages.ts");
  const header = read("apps/web/src/components/site-header.tsx");
  assert.match(messages, /navBilling/);
  assert.match(header, /workspace\/billing/);
});
