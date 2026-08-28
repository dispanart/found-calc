import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("calculator primitives preserve field error association and polite result announcements", async () => {
  const [field, result, trust, summary] = await Promise.all([
    read("apps/web/src/components/calculator/field.tsx"),
    read("apps/web/src/components/calculator/result-panel.tsx"),
    read("apps/web/src/components/calculator/trust-panel.tsx"),
    read("apps/web/src/components/calculator/validation-summary.tsx"),
  ]);

  assert.match(field, /aria-invalid/);
  assert.match(field, /aria-describedby/);
  assert.match(field, /-error/);
  assert.match(result, /role="status"/);
  assert.match(result, /aria-live="polite"/);
  assert.match(trust, /<aside|<section/);
  assert.match(summary, /role="alert"/);
});
