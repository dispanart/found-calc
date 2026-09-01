import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../../src/proxy.ts", import.meta.url), "utf8");

test("Next 16 proxy protects embed and preview boundaries and inspects the dedicated embed host globally", () => {
  assert.match(source, /export\s+async\s+function\s+proxy\s*\(/);
  assert.match(source, /NextRequest/);
  assert.match(source, /NextResponse/);
  assert.match(source, /matcher[\s\S]{0,300}["']\/embed\/:path\*["']/);
  assert.match(source, /matcher[\s\S]{0,300}["']\/widget-preview\/:path\*["']/);
  assert.match(source, /matcher[\s\S]{0,300}["']\/:path\*["']/);
  assert.match(source, /isAllowedEmbedHostPath/);
  assert.match(source, /resolvePublicWidgetRuntime/);
  assert.match(source, /Content-Security-Policy/);
});

test("proxy never trusts caller-supplied internal widget authorization headers", () => {
  assert.match(source, /headers\.delete\(["']x-foundcalc-widget-id["']\)/);
  assert.match(source, /headers\.delete\(["']x-foundcalc-domain-id["']\)/);
  assert.match(source, /headers\.delete\(["']x-foundcalc-parent-origin["']\)/);
  assert.doesNotMatch(source, /request\.headers\.get\(["']x-foundcalc-(widget-id|domain-id|parent-origin)["']\)/);
});

test("embed-host isolation names no auth, workspace, billing, or admin allowlist", () => {
  assert.doesNotMatch(source, /allow.*api\/auth|allow.*api\/workspace|allow.*api\/billing|allow.*admin/i);
});
