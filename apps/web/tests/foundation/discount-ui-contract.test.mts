import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("discount UI delegates parsing and calculation truth instead of duplicating arithmetic", async () => {
  const source = await readFile("apps/web/src/components/calculator/discount-calculator.tsx", "utf8");
  assert.match(source, /runDiscount/);
  assert.match(source, /parseLocaleDecimal/);
  assert.match(source, /formatCanonicalDecimal/);
  assert.match(source, /aria-label/);
  assert.doesNotMatch(source, /parseFloat|parseInt|Number\(/);
});
