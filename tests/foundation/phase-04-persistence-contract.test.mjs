import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 04 persistence is a narrow canonical-input boundary", () => {
  const migration = read("apps/web/migrations/0001_phase04_auth_and_calculator_state.sql");
  const state = read("apps/web/src/lib/persistence/state.ts");
  const repository = read("apps/web/src/lib/persistence/repository.ts");

  assert.match(migration, /CREATE TABLE(?: IF NOT EXISTS)? calculator_state/i);
  assert.match(migration, /UNIQUE\s*\(owner_type, owner_id, calculator_id\)/i);
  assert.match(migration, /CHECK\s*\(owner_type IN \('guest', 'user'\)\)/i);
  assert.match(state, /reference\.discount/);
  assert.match(state, /reference\.business-margin/);
  assert.match(state, /reference\.synthetic-rule/);
  assert.doesNotMatch(repository, /calculateDiscount|calculateBusinessMargin|calculateSyntheticRuleAmount/);
  assert.match(repository, /claimGuestStates/);
});
