import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("synthetic runtime consumes caller-supplied versions instead of static fixtures", () => {
  const clientPath = "apps/web/src/lib/rules/client.ts";
  assert.equal(existsSync(url(clientPath)), true, `${clientPath} must exist`);
  const runtime = read("apps/web/src/lib/calculators/runtime.ts");
  const client = read(clientPath);
  assert.match(runtime, /runSyntheticRule\s*=\s*\([^)]*versions/);
  assert.doesNotMatch(runtime, /syntheticRateRuleVersions/);
  assert.match(client, /fetchPublishedRuleVersions/);
  assert.match(client, /\/api\/rules\//);
});

test("synthetic calculator has explicit rule feed loading/error behavior without fixture fallback", () => {
  const source = read("apps/web/src/components/calculator/synthetic-rule-calculator.tsx");
  assert.match(source, /fetchPublishedRuleVersions/);
  assert.match(source, /ruleFeedStatus/);
  assert.match(source, /ruleFeedUnavailable/);
  assert.doesNotMatch(source, /syntheticRateRuleVersions/);
});
