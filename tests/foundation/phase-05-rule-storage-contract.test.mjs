import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 05 migration owns immutable versioned rule records and Better Auth admin fields", () => {
  const path = "apps/web/migrations/0002_phase05_rule_platform_admin.sql";
  assert.equal(existsSync(url(path)), true, `${path} must exist`);
  const migration = read(path);

  assert.match(migration, /ALTER TABLE user ADD COLUMN role TEXT/i);
  assert.match(migration, /ALTER TABLE user ADD COLUMN banned INTEGER/i);
  assert.match(migration, /ALTER TABLE user ADD COLUMN ban_reason TEXT/i);
  assert.match(migration, /ALTER TABLE user ADD COLUMN ban_expires INTEGER/i);
  assert.match(migration, /CREATE TABLE(?: IF NOT EXISTS)? rule_version/i);
  assert.match(migration, /UNIQUE\s*\(rule_id, version_id\)/i);
  assert.match(migration, /CHECK\s*\(status IN \('draft', 'published'\)\)/i);
  assert.match(migration, /reference\.synthetic-rate/);
  assert.match(migration, /2025-a/);
  assert.match(migration, /2026-a/);
  assert.match(migration, /rule_version_publication_overlap/);
});

test("Phase 05 payload and repository boundaries exist without formula execution", () => {
  const payloadPath = "apps/web/src/lib/rules/payload.ts";
  const repositoryPath = "apps/web/src/lib/rules/repository.ts";
  assert.equal(existsSync(url(payloadPath)), true, `${payloadPath} must exist`);
  assert.equal(existsSync(url(repositoryPath)), true, `${repositoryPath} must exist`);

  const payload = read(payloadPath);
  const repository = read(repositoryPath);
  assert.match(payload, /parseSupportedRuleDraft/);
  assert.match(payload, /reference\.synthetic-rate/);
  assert.match(payload, /ratePercent/);
  assert.match(repository, /listAdminVersions/);
  assert.match(repository, /listPublishedVersions/);
  assert.match(repository, /createDraft/);
  assert.match(repository, /publish/);
  assert.match(repository, /candidate\.status === "published"[\s\S]{0,120}return candidate/);
  assert.doesNotMatch(repository, /calculateSyntheticRuleAmount|multiplyDecimal|divideDecimal/);
});
