import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 06 calculator workspace controls do not compete with calculator result status landmarks", () => {
  const controls = read("src/components/calculator/workspace-calculation-controls.tsx");

  assert.doesNotMatch(controls, /role="status"/);
  assert.match(controls, /aria-live="polite"/);
});

test("Phase 06 workspace renders the signed-in account email only once", () => {
  const dashboard = read("src/components/workspace/workspace-dashboard.tsx");
  const persistence = read("src/components/workspace/persistence-summary.tsx");

  assert.match(dashboard, /session\.user\.email/);
  assert.doesNotMatch(persistence, /\{email\}/);
  assert.doesNotMatch(persistence, /email=\{session\.user\.email\}/);
});

test("Phase 06 Project selector keeps its form label unique instead of naming wrapper regions", () => {
  const controls = read("src/components/calculator/workspace-calculation-controls.tsx");

  assert.doesNotMatch(controls, /<section[^>]*aria-labelledby=\{`workspace-save-\$\{calculatorId\}`\}/);
  assert.match(controls, /htmlFor=\{`workspace-project-\$\{calculatorId\}`\}/);
  assert.match(controls, /id=\{`workspace-project-\$\{calculatorId\}`\}/);
});
