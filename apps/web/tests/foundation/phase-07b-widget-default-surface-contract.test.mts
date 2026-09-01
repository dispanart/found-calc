import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file: string) => readFile(`apps/web/src/components/calculator/${file}`, "utf8");

test("widget calculators consume canonical memory-only defaults through presentation formatting", async () => {
  const discount = await read("discount-calculator.tsx");
  assert.match(discount, /surface\.initialDefaults/);
  assert.match(discount, /baseAmount/);
  assert.match(discount, /discountPercentages/);
  assert.match(discount, /formatCanonicalDecimal/);

  const margin = await read("business-margin-calculator.tsx");
  assert.match(margin, /surface\.initialDefaults/);
  assert.match(margin, /sellingPrice/);
  assert.match(margin, /productCost/);
  assert.match(margin, /variableSellingCostPerOrder/);
  assert.match(margin, /formatCanonicalDecimal/);

  const synthetic = await read("synthetic-rule-calculator.tsx");
  assert.match(synthetic, /surface\.initialDefaults/);
  assert.match(synthetic, /baseAmount/);
  assert.match(synthetic, /formatCanonicalDecimal/);
  assert.doesNotMatch(synthetic, /initialDefaults[^\n]{0,180}effectiveDate/);
});

test("widget default initialization stays separate from calculation and persistence", async () => {
  for (const file of ["discount-calculator.tsx", "business-margin-calculator.tsx", "synthetic-rule-calculator.tsx"]) {
    const source = await read(file);
    assert.match(source, /surface\.surface !== ["']public["']/);
    assert.doesNotMatch(source, /useEffect\([\s\S]{0,500}initialDefaults[\s\S]{0,500}(runDiscount|runBusinessMargin|runSyntheticRule)/);
    assert.doesNotMatch(source, /initialDefaults[\s\S]{0,400}writeLocalDraft/);
  }
});
