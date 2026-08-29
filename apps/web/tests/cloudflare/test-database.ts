import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import phase04MigrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";
import phase05MigrationSql from "../../migrations/0002_phase05_rule_platform_admin.sql?raw";
import phase06MigrationSql from "../../migrations/0003_phase06_workspace.sql?raw";

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
  "workspace_calculation",
  "workspace_project_invite",
  "workspace_project_member",
  "workspace_project",
  "workspace_goal",
  "user_profile",
  "rule_version",
  ...phase04TablesInDropOrder,
] as const;

export const splitD1MigrationStatements = (sql: string): string[] => {
  const statements: string[] = [];
  let current: string[] = [];
  let inTrigger = false;

  const flush = () => {
    const statement = current.join("\n").trim();
    if (statement.length > 0) statements.push(statement);
    current = [];
  };

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("--")) continue;

    if (!inTrigger && /^CREATE\s+TRIGGER\b/i.test(trimmed)) {
      inTrigger = true;
    }

    current.push(line);

    if (inTrigger) {
      if (/^END;\s*$/i.test(trimmed)) {
        flush();
        inTrigger = false;
      }
      continue;
    }

    if (/;\s*$/.test(trimmed)) flush();
  }

  flush();
  return statements;
};

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
};

export const resetPhase04Database = async (db: D1Database, migrationSql: string) => {
  const dropStatements = phase04TablesInDropOrder.map((table) =>
    db.prepare(`DROP TABLE IF EXISTS ${table}`),
  );

  await db.batch(dropStatements);
  await applySql(db, migrationSql);
};
