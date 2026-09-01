import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("public and widget surfaces delegate all three reference calculators to one renderer registry", () => {
  const publicPage = read("src/app/[locale]/(public)/calculators/[slug]/page.tsx");
  const frame = read("src/components/widgets/widget-frame.tsx");
  const registry = read("src/components/calculator/renderer-registry.tsx");
  assert.match(publicPage, /CalculatorRenderer/);
  assert.match(frame, /CalculatorRenderer/);
  for (const id of ["reference.discount", "reference.business-margin", "reference.synthetic-rule"]) assert.match(registry, new RegExp(id.replace(".", "\\.")));
});

test("widget platform code contains no calculator arithmetic or synthetic rule fixtures", () => {
  const files = [
    "src/lib/widgets/runtime.ts",
    "src/components/widgets/widget-frame.tsx",
    "src/components/widgets/widget-creation-flow.tsx",
  ].map(read).join("\n");
  assert.doesNotMatch(files, /grossProfit\s*=|finalAmount\s*=|ratePercent\s*=|syntheticRateRuleVersions/);
});
