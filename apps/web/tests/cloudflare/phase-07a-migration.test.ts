import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import phase07aMigrationSql from "../../migrations/0005_phase07a_commercial_auth_amendment.sql?raw";
import { resetCurrentDatabase, splitD1MigrationStatements } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const applySql = async (sql: string) => {
  const statements = splitD1MigrationStatements(sql).map((statement) => env.DB.prepare(statement));
  if (statements.length > 0) await env.DB.batch(statements);
};

beforeEach(async () => {
  await resetCurrentDatabase();
});

describe("Phase 07A additive migration", () => {
  it("preserves Phase 04-07 production-shaped data while adding trial and paid-through schema", async () => {
    await env.DB.prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
    ).bind("phase07a-existing-user", "Existing user", "existing@phase07a.test").run();

    await env.DB.prepare(
      "INSERT INTO workspace_goal (id, owner_user_id, title, status, created_at, updated_at) VALUES (?, ?, ?, 'active', 10, 10)",
    ).bind("phase07a-goal", "phase07a-existing-user", "Existing goal").run();
    await env.DB.prepare(
      "INSERT INTO workspace_project (id, owner_user_id, goal_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', 11, 11)",
    ).bind("phase07a-project", "phase07a-existing-user", "phase07a-goal", "Existing project").run();
    await env.DB.prepare(
      "INSERT INTO workspace_calculation (id, project_id, created_by_user_id, title, calculator_id, calculator_version, state_json, created_at) VALUES (?, ?, ?, ?, 'reference.discount', '1', '{}', 12)",
    ).bind("phase07a-calculation", "phase07a-project", "phase07a-existing-user", "Existing calculation").run();
    await env.DB.prepare(
      "INSERT INTO rule_version (id, rule_id, version_id, effective_from, payload_json, source_id, status, created_by_user_id, created_at) VALUES (?, ?, ?, '2027-01-01', '{}', 'phase07a-migration-test', 'draft', ?, 13)",
    ).bind("phase07a-rule", "phase07a.test-rule", "2027-a", "phase07a-existing-user").run();
    await env.DB.prepare(
      "INSERT INTO billing_subscription (id, user_id, plan_id, provider_plan_id, reference_id, status, latest_event_at, latest_event_rank, created_at, updated_at) VALUES (?, ?, 'pro-monthly', ?, ?, 'active', 14, 20, 14, 14)",
    ).bind("phase07a-subscription", "phase07a-existing-user", "provider-phase07a-existing", "reference-phase07a-existing").run();

    await applySql(phase07aMigrationSql);

    const preserved = await env.DB.prepare(`
      SELECT
        (SELECT count(*) FROM user WHERE id = 'phase07a-existing-user') AS user_count,
        (SELECT count(*) FROM workspace_goal WHERE id = 'phase07a-goal') AS goal_count,
        (SELECT count(*) FROM workspace_project WHERE id = 'phase07a-project') AS project_count,
        (SELECT count(*) FROM workspace_calculation WHERE id = 'phase07a-calculation') AS calculation_count,
        (SELECT count(*) FROM rule_version WHERE id = 'phase07a-rule') AS rule_count,
        (SELECT count(*) FROM billing_subscription WHERE id = 'phase07a-subscription' AND plan_id = 'pro-monthly') AS subscription_count
    `).first<Record<string, number>>();

    expect(preserved).toMatchObject({
      user_count: 1,
      goal_count: 1,
      project_count: 1,
      calculation_count: 1,
      rule_count: 1,
      subscription_count: 1,
    });

    const paidThroughColumn = await env.DB.prepare("SELECT name FROM pragma_table_info('billing_subscription') WHERE name = 'paid_through_at'").first<{ name: string }>();
    const trialTable = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'billing_trial'").first<{ name: string }>();
    const trialIndex = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'billing_trial_ends_idx'").first<{ name: string }>();

    expect(paidThroughColumn?.name).toBe("paid_through_at");
    expect(trialTable?.name).toBe("billing_trial");
    expect(trialIndex?.name).toBe("billing_trial_ends_idx");
  });
});
