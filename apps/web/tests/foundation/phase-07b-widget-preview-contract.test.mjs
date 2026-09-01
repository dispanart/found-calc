import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("owner preview is isolated, shares the widget renderer, and suppresses public lifecycle messaging", () => {
  assert.equal(existsSync(url("src/app/widget-preview/[widgetId]/page.tsx")), true);
  const page = read("src/app/widget-preview/[widgetId]/page.tsx");
  const frame = read("src/components/widgets/widget-frame.tsx");
  assert.match(page, /resolveWidgetPreviewRuntime/);
  assert.match(page, /WidgetFrame/);
  assert.match(page, /getSession/);
  assert.match(page, /lifecycleEnabled=\{false\}/);
  assert.match(frame, /lifecycleEnabled/);
});

test("preview CSP is self-only and preview never becomes an embed-host route", () => {
  const security = read("src/lib/widgets/security.ts");
  const proxy = read("src/proxy.ts");
  assert.match(security, /frame-ancestors 'self'/);
  assert.match(proxy, /widget-preview/);
  assert.match(proxy, /buildWidgetPreviewCsp/);
  assert.match(proxy, /onEmbedHost/);
});

test("management preview exposes only the approved width presets", () => {
  const configurator = read("src/components/widgets/widget-configurator.tsx");
  assert.match(configurator, /320/);
  assert.match(configurator, /390/);
  assert.match(configurator, /container/i);
  assert.match(configurator, /widget-preview/);
  assert.match(configurator, /<iframe/);
});
