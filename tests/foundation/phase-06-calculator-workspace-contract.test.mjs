import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("calculator workspace history is explicit and never replaces Phase 04 draft controls", () => {
  const controlsPath = "apps/web/src/components/calculator/workspace-calculation-controls.tsx";
  assert.equal(existsSync(url(controlsPath)), true, `${controlsPath} must exist`);
  const controls = read(controlsPath);
  assert.match(controls, /data-testid=["']load-workspace-calculation["']/);
  assert.match(controls, /fetchWorkspaceCalculation/);
  assert.match(controls, /onLoad\(record\.state\)/);
  assert.doesNotMatch(controls, /useEffect\([\s\S]{0,700}onLoad\(record\.state\)/);

  for (const file of ["discount-calculator.tsx", "business-margin-calculator.tsx", "synthetic-rule-calculator.tsx"]) {
    const source = read(`apps/web/src/components/calculator/${file}`);
    assert.match(source, /<PersistenceControls\b/, `${file} must retain Phase 04 draft controls`);
    assert.match(source, /<WorkspaceCalculationControls\b/, `${file} must add separate named history controls`);
  }
});

test("calculator page normalizes a Next.js 16 async record search param", () => {
  const page = read("apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx");
  assert.match(page, /searchParams:\s*Promise</);
  assert.match(page, /await searchParams/);
  assert.match(page, /const recordId = isWorkspaceId/);
  assert.match(
    page,
    /CalculatorRenderer[\s\S]{0,260}policy=\{\{\s*surface:\s*["']public["'],\s*\.\.\.\(recordId === undefined \? \{\} : \{ recordId \}\)\s*\}\}/,
  );
  assert.doesNotMatch(page, /localStorage[\s\S]{0,120}(token|session)|(token|session)[\s\S]{0,120}localStorage/i);
});
