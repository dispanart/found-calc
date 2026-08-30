import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 07A pricing exposes the approved Friends, Besties, and Family promise without claiming future runtimes", () => {
  const page = read("apps/web/src/app/[locale]/(public)/pricing/page.tsx");
  const panel = read("apps/web/src/components/billing/pricing-panel.tsx");
  const billingPanel = read("apps/web/src/components/billing/billing-panel.tsx");
  const billingClient = read("apps/web/src/lib/billing/client.ts");
  const header = read("apps/web/src/components/site-header.tsx");

  assert.match(page, /<PricingPanel/);
  assert.match(panel, /Semua kalkulator tetap gratis\. Upgrade ketika Anda membutuhkan lebih\./);
  assert.match(panel, /Calculate for free\. Upgrade when you need more\./);
  for (const value of ["Friends", "Besties", "Family", "Rp24.900", "Rp199.000", "Rp59.000", "Rp499.000", "Saved Calculations", "14 hari", "14 days", "Portfolio"]) {
    assert.match(panel, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(panel, /publicPlanName/);
  assert.match(panel, /commercialLimitsFor/);
  assert.match(panel, /Widget Platform/);
  assert.match(panel, /belum tersedia|not yet available/i);
  assert.match(panel, /data.*tetap|data.*remain/i);
  assert.match(panel, /cancel|batal/i);

  assert.match(header, /\/pricing/);
  assert.match(billingPanel, /startBestiesTrial/);
  assert.match(billingClient, /commercial/);
  assert.match(billingClient, /trial/);
  assert.match(billingClient, /paidThroughAt/);
});

test("Phase 07A pricing starts Besties trial directly for an authenticated account and preserves auth return for anonymous users", () => {
  const panel = read("apps/web/src/components/billing/pricing-panel.tsx");
  assert.match(panel, /^"use client";/m);
  assert.match(panel, /authClient\.useSession\(\)/);
  assert.match(panel, /startBestiesTrial\(\)/);
  assert.match(panel, /session\?\.user/);
  assert.match(panel, /\/workspace\/billing/);
  assert.match(panel, /\/auth\?returnTo=/);
});
