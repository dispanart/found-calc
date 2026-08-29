import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 06 optional workspace values remain valid under exactOptionalPropertyTypes", () => {
  const discount = read("src/components/calculator/discount-calculator.tsx");
  const margin = read("src/components/calculator/business-margin-calculator.tsx");
  const synthetic = read("src/components/calculator/synthetic-rule-calculator.tsx");
  const controls = read("src/components/calculator/workspace-calculation-controls.tsx");
  const dashboard = read("src/components/workspace/workspace-dashboard.tsx");
  const client = read("src/lib/workspace/client.ts");

  for (const source of [discount, margin, synthetic, controls]) {
    assert.match(source, /recordId\?: string \| undefined/);
  }
  assert.match(controls, /ruleContext\?: SyntheticRuleContext \| undefined/);
  assert.match(dashboard, /success: string = text\.saved/);
  assert.equal((client.match(/signal: signal \?\? null/g) ?? []).length, 2);
});
