import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 05 keeps engine truth out of persistence/admin/network adapters", () => {
  for (const path of [
    "apps/web/src/lib/rules/repository.ts",
    "apps/web/src/lib/rules/http.ts",
    "apps/web/src/lib/rules/client.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /calculateDiscount|calculateBusinessMargin|calculateSyntheticRuleAmount|multiplyDecimal|divideDecimal/);
    assert.doesNotMatch(source, /console\.(log|info|debug).*baseAmount|console\.(log|info|debug).*ratePercent/i);
  }
});

test("Phase 05 implements no production rule catalog, billing, project, analytics, or AI surface", () => {
  const migration = read("apps/web/migrations/0002_phase05_rule_platform_admin.sql");
  const admin = read("apps/web/src/components/admin/rule-admin-panel.tsx");
  assert.match(migration, /synthetic-reference-fixture/);
  assert.match(admin, /Synthetic data only|Data sintetis saja/);
  assert.doesNotMatch(migration, /xendit|subscription|payment|project|analytics|embedding|vector/i);
  assert.doesNotMatch(admin, /xendit|subscription|payment|project history|analytics|AI explanation/i);
});
