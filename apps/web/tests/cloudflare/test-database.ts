import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import phase04MigrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";
import phase05MigrationSql from "../../migrations/0002_phase05_rule_platform_admin.sql?raw";
import phase06MigrationSql from "../../migrations/0003_phase06_workspace.sql?raw";
import phase07MigrationSql from "../../migrations/0004_phase07_billing.sql?raw";
import phase07aMigrationSql from "../../migrations/0005_phase07a_commercial_auth_amendment.sql?raw";

const phase04TablesInDropOrder = [
  "calculator_state",
  "verification",
  "account",
  "session",
  "user",
] as const;

const currentTriggersInDropOrder = [
  "workspace_project_invite_redeem_member",
  "rule_version_published_delete_forbidden",
  "rule_version_published_immutable",
  "rule_version_publication_overlap",
] as const;

const currentTablesInDropOrder = [
  "billing_trial",
  "billing_webhook_inbox",
  "billing_subscription",
  "billing_checkout",
  "billing_customer",
  "workspace_calculation",
  "workspace_project_invite",
  "workspace_project_member",
  "workspace_project",
  "workspace_goal",
  "user_profile",
  "rule_version",
  ...phase04TablesInDropOrder,
] as const;

export { splitD1MigrationStatements } from "./sql-statements";
import { splitD1MigrationStatements } from "./sql-statements";

const applySql = async (db: D1Database, sql: string) => {
  const statements = splitD1MigrationStatements(sql).map((statement) => db.prepare(statement));
  if (statements.length > 0) await db.batch(statements);
};

export const resetCurrentDatabase = async () => {
  const dropTriggers = currentTriggersInDropOrder.map((trigger) =>
    env.DB.prepare(`DROP TRIGGER IF EXISTS ${trigger}`),
  );
  const dropTables = currentTablesInDropOrder.map((table) =>
    env.DB.prepare(`DROP TABLE IF EXISTS ${table}`),
  );

  await env.DB.batch([...dropTriggers, ...dropTables]);
  await applySql(env.DB, phase04MigrationSql);
  await applySql(env.DB, phase05MigrationSql);
  await applySql(env.DB, phase06MigrationSql);
  await applySql(env.DB, phase07MigrationSql);
  await applySql(env.DB, phase07aMigrationSql);
};

export const resetPhase04Database = async (db: D1Database, migrationSql: string) => {
  const dropStatements = phase04TablesInDropOrder.map((table) =>
    db.prepare(`DROP TABLE IF EXISTS ${table}`),
  );

  await db.batch(dropStatements);
  await applySql(db, migrationSql);
};