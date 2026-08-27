import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Phase 01 verification gate preserves the required command order", async () => {
  const source = await readFile("scripts/verify-phase-01.mjs", "utf8");
  const expected = [
    "lint",
    "typecheck",
    "test:unit",
    "test:cloudflare",
    "test:e2e",
    "build",
    "vinext:check",
    "build:vinext",
  ];

  let previous = -1;
  for (const token of expected) {
    const index = source.indexOf(`\"${token}\"`);
    assert.ok(index > previous, `${token} should appear after the previous verification command`);
    previous = index;
  }
});
