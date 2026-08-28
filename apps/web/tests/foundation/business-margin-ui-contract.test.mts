import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("business margin UI delegates baseline and scenario truth to the Phase 02 runtime", async () => {
  const source = await readFile("apps/web/src/components/calculator/business-margin-calculator.tsx", "utf8");
  assert.match(source, /runBusinessMargin/);
  assert.match(source, /runBusinessMarginScenario/);
  assert.match(source, /parseLocaleDecimal/);
  assert.match(source, /formatCanonicalDecimal/);
  assert.match(source, /data-testid="scenario-impact"/);
  assert.doesNotMatch(source, /parseFloat|parseInt|Number\(/);
});

test("business margin UI uses canonical catalog copy for contextual and demo guidance", async () => {
  const source = await readFile("apps/web/src/components/calculator/business-margin-calculator.tsx", "utf8");
  assert.match(source, /helper=\{copy\.ui\.contextualHint\}/);
  assert.match(source, /copy\.ui\.recommendationTitle/);
  assert.match(source, /copy\.ui\.demoNote/);
  assert.doesNotMatch(source, /copy\.ui\.advancedTitle|copy\.ui\.recommendationDemoNote/);
});