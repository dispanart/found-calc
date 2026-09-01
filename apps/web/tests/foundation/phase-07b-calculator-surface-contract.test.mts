import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

const calculatorFiles = [
  "apps/web/src/components/calculator/discount-calculator.tsx",
  "apps/web/src/components/calculator/business-margin-calculator.tsx",
  "apps/web/src/components/calculator/synthetic-rule-calculator.tsx",
] as const;

test("public calculator page delegates calculator selection to the shared renderer registry", async () => {
  const source = await read("apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx");
  assert.match(source, /CalculatorRenderer/);
  assert.doesNotMatch(source, /DiscountCalculator|BusinessMarginCalculator|SyntheticRuleCalculator/);
  assert.match(source, /surface:\s*["']public["']/);
  assert.match(source, /recordId/);
});

test("renderer registry contains exactly the three canonical reference calculator ids", async () => {
  const source = await read("apps/web/src/components/calculator/renderer-registry.tsx");
  const ids = source.match(/reference\.(?:discount|business-margin|synthetic-rule)/g) ?? [];
  assert.deepEqual([...new Set(ids)].sort(), [
    "reference.business-margin",
    "reference.discount",
    "reference.synthetic-rule",
  ]);
  assert.match(source, /CalculatorSurfaceProvider/);
});

test("calculator surface policy defaults to public and exposes memory-only widget lifecycle hooks", async () => {
  const source = await read("apps/web/src/components/calculator/calculator-surface.tsx");
  assert.match(source, /surface:\s*["']public["']/);
  assert.match(source, /initialDefaults/);
  assert.match(source, /calculator_started/);
  assert.match(source, /calculation_completed/);
  assert.match(source, /cta_clicked/);
});

test("all reference calculators gate persistence behind public surface and emit widget lifecycle events", async () => {
  for (const path of calculatorFiles) {
    const source = await read(path);
    assert.match(source, /useCalculatorSurface/);
    assert.match(source, /surface\.surface\s*===\s*["']public["']/);
    assert.match(source, /surface\.onLifecycleEvent/);
    assert.match(source, /calculator_started/);
    assert.match(source, /calculation_completed/);
    assert.match(source, /PersistenceControls/);
    assert.match(source, /WorkspaceCalculationControls/);
  }
});
