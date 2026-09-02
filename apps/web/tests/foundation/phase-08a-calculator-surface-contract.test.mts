import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

const phase08aCalculatorFiles = [
  "apps/web/src/components/calculator/percentage-calculator.tsx",
  "apps/web/src/components/calculator/date-difference-calculator.tsx",
  "apps/web/src/components/calculator/length-conversion-calculator.tsx",
] as const;

test("Phase 08A shared renderer registers all six routable calculator ids", async () => {
  const source = await read("apps/web/src/components/calculator/renderer-registry.tsx");
  for (const id of [
    "reference.discount",
    "reference.business-margin",
    "reference.synthetic-rule",
    "quick.percentage",
    "quick.date-difference",
    "quick.length-conversion",
  ]) {
    assert.match(source, new RegExp(id.replace(".", "\\.")));
  }
  assert.match(source, /CalculatorCatalogEntry/);
  assert.match(source, /CalculatorSurfaceProvider/);
});

test("new Quick calculators are dedicated interaction renderers with shared surface hooks", async () => {
  for (const path of phase08aCalculatorFiles) {
    const source = await read(path);
    assert.match(source, /useCalculatorSurface/);
    assert.match(source, /PersistenceControls/);
    assert.match(source, /WorkspaceCalculationControls/);
    assert.match(source, /calculator_started/);
    assert.match(source, /calculation_completed/);
  }
});

test("Length Conversion uses per-instance select ids so labels remain valid across repeated surfaces", async () => {
  const source = await read("apps/web/src/components/calculator/length-conversion-calculator.tsx");
  assert.match(source, /useId/);
  assert.match(source, /htmlFor=\{fromUnitId\}/);
  assert.match(source, /htmlFor=\{toUnitId\}/);
  assert.match(source, /id=\{fromUnitId\}/);
  assert.match(source, /id=\{toUnitId\}/);
  assert.doesNotMatch(source, /id="length-from-unit"/);
  assert.doesNotMatch(source, /id="length-to-unit"/);
});

test("public calculator routing uses the aggregate production catalog", async () => {
  const source = await read("apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx");
  assert.match(source, /calculatorCatalog/);
  assert.match(source, /getCalculatorBySlug/);
  assert.doesNotMatch(source, /getReferenceCalculatorBySlug/);
});
