import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 07A calculator auth link preserves its same-origin route, query, and hash context without a search-param render dependency", () => {
  const controls = read("apps/web/src/components/calculator/workspace-calculation-controls.tsx");

  assert.match(controls, /window\.location\.pathname/);
  assert.match(controls, /window\.location\.search/);
  assert.match(controls, /window\.location\.hash/);
  assert.match(controls, /returnTo/);
  assert.match(controls, /\/auth\?returnTo=/);
  assert.match(controls, /encodeURIComponent/);
  assert.doesNotMatch(controls, /useSearchParams/);
});
