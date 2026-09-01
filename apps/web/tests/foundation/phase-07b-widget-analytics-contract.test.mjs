import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("widget analytics schema and route never accept raw calculator values", () => {
  const analytics = read("src/lib/widgets/analytics.ts");
  const route = read("src/app/api/embed/[publicWidgetKey]/events/route.ts");
  for (const forbidden of ["rawInput", "resultValue", "salary", "income", "revenue", "taxValue", "debt", "health", "fiqh"]) {
    assert.doesNotMatch(analytics, new RegExp(`\\b${forbidden}\\b`, "i"));
    assert.doesNotMatch(route, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
  assert.match(analytics, /resolvePublicWidgetRuntime/);
  assert.match(analytics, /analytics\.increment/);
  assert.match(analytics, /eventType/);
  assert.doesNotMatch(analytics, /input\s*:\s*event|result\s*:\s*event|value\s*:\s*event|amount\s*:\s*event/);
});

test("management analytics reads apply bounded 90-day aggregate retention", () => {
  const analytics = read("src/lib/widgets/analytics.ts");
  const route = read("src/app/api/workspace/widgets/[widgetId]/analytics/route.ts");
  assert.match(analytics, /RETENTION_DAYS\s*=\s*90/);
  assert.match(analytics, /analytics\.deleteBefore/);
  assert.match(route, /cleanupWidgetAnalyticsRetention/);
  assert.match(route, /if \(response\.ok\)/);
});

test("calculator lifecycle bridge emits event names only", () => {
  const surface = read("src/components/calculator/calculator-surface.tsx");
  const lifecycle = read("src/components/widgets/widget-lifecycle.tsx");
  assert.match(surface, /FOUND_CALC_WIDGET_LIFECYCLE_EVENT/);
  assert.match(lifecycle, /widget_viewed/);
  assert.match(lifecycle, /calculator_started/);
  assert.match(lifecycle, /calculation_completed/);
  assert.doesNotMatch(lifecycle, /rawInput|resultValue|salary|income|revenue|taxValue|debt|health|fiqh/i);
});
