import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("widget management has localized list/detail pages and purpose-built components", () => {
  const paths = [
    "src/app/[locale]/(workspace)/workspace/widgets/page.tsx",
    "src/app/[locale]/(workspace)/workspace/widgets/[widgetId]/page.tsx",
    "src/components/widgets/widget-manager.tsx",
    "src/components/widgets/widget-list.tsx",
    "src/components/widgets/widget-creation-flow.tsx",
    "src/components/widgets/widget-configurator.tsx",
    "src/components/widgets/widget-analytics-summary.tsx",
  ];
  for (const path of paths) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const list = read("src/components/widgets/widget-list.tsx");
  assert.match(list, /<table/);
  assert.match(list, /Widget Name|Nama Widget/);
  assert.match(list, /Calculator|Kalkulator/);
  assert.match(list, /Domain/);
  assert.match(list, /Plan capability|Kapabilitas paket/);
  assert.match(list, /Last activity|Aktivitas terakhir/);
  assert.doesNotMatch(list, /grid-cols-[234]/);
});

test("creation flow preserves approved progressive order and entitlement-safe embed generation", () => {
  const flow = read("src/components/widgets/widget-creation-flow.tsx");
  const ordered = ["Choose calculator", "Select locale", "Add or choose domain", "Verify domain", "Appearance", "Safe defaults", "Preview", "Copy embed code"];
  let cursor = -1;
  for (const label of ordered) {
    const next = flow.indexOf(label);
    assert.ok(next > cursor, `${label} must appear after the prior step`);
    cursor = next;
  }
  assert.match(flow, /Needs verification/);
  assert.match(flow, /branding.*Friends|Friends.*branding/is);
  assert.match(flow, /embed\.js/);
  assert.match(flow, /data-foundcalc-widget/);
  assert.match(flow, /data-foundcalc-title/);
  assert.doesNotMatch(flow, /hideBranding|entitlement=/i);
});

test("widget client and manager keep auth/provider boundaries intact", () => {
  const client = read("src/lib/widgets/client.ts");
  const manager = read("src/components/widgets/widget-manager.tsx");
  const header = read("src/components/site-header.tsx");
  assert.match(client, /credentials:\s*["']include["']/);
  assert.doesNotMatch(client, /xendit|providerId|billingId/i);
  assert.match(manager, /authClient\.useSession/);
  assert.match(header, /workspace\/widgets/);
});
