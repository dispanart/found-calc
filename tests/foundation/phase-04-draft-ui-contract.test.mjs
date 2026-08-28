import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 04 local drafts are namespaced, schema-versioned, browser-only, and contain no auth storage", () => {
  const helperPath = "apps/web/src/lib/persistence/local-draft.ts";
  assert.equal(existsSync(url(helperPath)), true, `${helperPath} must exist`);
  const helper = read(helperPath);

  assert.match(helper, /found-calc:draft:v1:/);
  assert.match(helper, /localStorage/);
  assert.match(helper, /readLocalDraft/);
  assert.match(helper, /writeLocalDraft/);
  assert.match(helper, /removeLocalDraft/);
  assert.doesNotMatch(helper, /auth[_-]?token|session[_-]?token|bearer/i);
});

test("all three reference calculators expose explicit save, load, and delete persistence controls", () => {
  const controlsPath = "apps/web/src/components/calculator/persistence-controls.tsx";
  assert.equal(existsSync(url(controlsPath)), true, `${controlsPath} must exist`);
  const controls = read(controlsPath);

  assert.match(controls, /Save draft|Simpan draft/);
  assert.match(controls, /Load saved draft|Muat draft tersimpan/);
  assert.match(controls, /Delete saved draft|Hapus draft tersimpan/);
  assert.match(controls, /aria-live="polite"/);
  assert.match(controls, /calculation still happens locally|perhitungan tetap dilakukan secara lokal/i);

  for (const filename of [
    "discount-calculator.tsx",
    "business-margin-calculator.tsx",
    "synthetic-rule-calculator.tsx",
  ]) {
    const source = read(`apps/web/src/components/calculator/${filename}`);
    assert.match(source, /PersistenceControls/);
    assert.match(source, /readLocalDraft/);
    assert.match(source, /writeLocalDraft/);
  }
});
