import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 07 billing storage is a separate D1 domain with webhook dedupe", () => {
  const migrationPath = "apps/web/migrations/0004_phase07_billing.sql";
  const repositoryPath = "apps/web/src/lib/billing/repository.ts";
  assert.equal(existsSync(url(migrationPath)), true, `${migrationPath} must exist`);
  assert.equal(existsSync(url(repositoryPath)), true, `${repositoryPath} must exist`);
  const migration = read(migrationPath);
  for (const table of ["billing_customer", "billing_checkout", "billing_subscription", "billing_webhook_inbox"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /PRIMARY KEY \(dedupe_key\)|dedupe_key TEXT PRIMARY KEY/i);
  assert.match(migration, /claim_token TEXT NOT NULL/i);
  assert.match(migration, /CHECK \(status IN \('pending', 'active', 'past_due', 'inactive'\)\)/i);
  assert.doesNotMatch(migration, /ALTER TABLE (calculator_state|rule_version|workspace_)/i);

  const repository = read(repositoryPath);
  assert.match(repository, /binding\.batch\s*\(/);
  assert.match(repository, /INSERT OR IGNORE INTO billing_webhook_inbox/i);
  assert.match(repository, /excluded\.latest_event_at\s*>\s*billing_subscription\.latest_event_at/i);
  assert.match(repository, /excluded\.latest_event_at\s*=\s*billing_subscription\.latest_event_at[\s\S]*excluded\.latest_event_rank\s*>=\s*billing_subscription\.latest_event_rank/i);
  assert.doesNotMatch(repository, /@found-calc\/engine|@found-calc\/rules/);
});
