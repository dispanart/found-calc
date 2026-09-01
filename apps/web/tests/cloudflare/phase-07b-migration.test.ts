import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import phase07bMigrationSql from "../../migrations/0006_phase07b_widget_platform.sql?raw";
import { resetCurrentDatabase, splitD1MigrationStatements } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const applySql = async (sql: string) => {
  const statements = splitD1MigrationStatements(sql).map((statement) => env.DB.prepare(statement));
  if (statements.length > 0) await env.DB.batch(statements);
};

beforeEach(async () => {
  await resetCurrentDatabase();
});

describe("Phase 07B additive widget migration", () => {
  it("preserves Phase 07A data and enforces widget platform schema constraints", async () => {
    await env.DB.prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
    ).bind("phase07b-existing-user", "Existing user", "existing@phase07b.test").run();
    await env.DB.prepare(
      "INSERT INTO billing_trial (user_id, trial_tier, started_at, ends_at, created_at, updated_at) VALUES (?, 'besties', 100, 200, 100, 100)",
    ).bind("phase07b-existing-user").run();
    await env.DB.prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
    ).bind("phase07b-owner", "Owner", "owner@phase07b.test").run();

    await applySql(phase07bMigrationSql);

    const preserved = await env.DB.prepare(`
      SELECT
        (SELECT count(*) FROM user WHERE id = 'phase07b-existing-user') AS user_count,
        (SELECT count(*) FROM billing_trial WHERE user_id = 'phase07b-existing-user') AS trial_count
    `).first<Record<string, number>>();
    expect(preserved).toMatchObject({ user_count: 1, trial_count: 1 });

    const tableRows = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'widget_%' ORDER BY name",
    ).all<{ name: string }>();
    expect(tableRows.results.map((row) => row.name)).toEqual([
      "widget_configuration",
      "widget_domain",
      "widget_domain_binding",
      "widget_event_daily",
      "widget_verification",
    ]);

    const expectedIndexes = [
      "widget_configuration_owner_idx",
      "widget_domain_binding_domain_idx",
      "widget_domain_owner_pair_active_unique",
      "widget_domain_owner_status_idx",
      "widget_event_daily_widget_day_idx",
      "widget_verification_domain_status_idx",
    ];
    const indexRows = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'widget_%' ORDER BY name",
    ).all<{ name: string }>();
    const indexNames = indexRows.results.map((row) => row.name);
    for (const indexName of expectedIndexes) expect(indexNames).toContain(indexName);

    const insertDomain = (id: string, deletedAt: number | null = null) => env.DB.prepare(`
      INSERT INTO widget_domain
        (id, owner_user_id, normalized_hostname, display_hostname, pair_key, status, verified_at, created_at, updated_at, deleted_at)
      VALUES (?, 'phase07b-owner', ?, ?, 'example.com', 'active', 100, 100, 100, ?)
    `).bind(id, id === "domain-www" ? "www.example.com" : "example.com", "example.com", deletedAt).run();

    await insertDomain("domain-apex");
    await expect(insertDomain("domain-www")).rejects.toThrow();
    await env.DB.prepare("UPDATE widget_domain SET deleted_at = 200 WHERE id = 'domain-apex'").run();
    await expect(insertDomain("domain-www")).resolves.toBeDefined();

    const insertWidget = (id: string) => env.DB.prepare(`
      INSERT INTO widget_configuration
        (id, owner_user_id, public_widget_key, public_key_version, name, calculator_id, locale, status, theme_json, branding_preference, default_input_configuration_json, created_at, updated_at)
      VALUES (?, 'phase07b-owner', 'fcw_duplicate_key_fixture', 1, 'Widget', 'reference.discount', 'en', 'active', '{}', 'foundcalc', '{}', 100, 100)
    `).bind(id).run();

    await insertWidget("widget-one");
    await expect(insertWidget("widget-two")).rejects.toThrow();
  });
});
