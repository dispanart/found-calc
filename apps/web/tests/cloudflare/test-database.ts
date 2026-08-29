import type { D1Database } from "@cloudflare/workers-types";

const phase04TablesInDropOrder = [
  "calculator_state",
  "verification",
  "account",
  "session",
  "user",
] as const;

const splitMigrationStatements = (sql: string): string[] =>
  sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

export const resetPhase04Database = async (db: D1Database, migrationSql: string) => {
  const dropStatements = phase04TablesInDropOrder.map((table) =>
    db.prepare(`DROP TABLE IF EXISTS ${table}`),
  );
  const migrationStatements = splitMigrationStatements(migrationSql).map((statement) =>
    db.prepare(statement),
  );

  await db.batch([...dropStatements, ...migrationStatements]);
};

export const resetPhase05Database = async (
  db: D1Database,
  phase04MigrationSql: string,
  phase05MigrationSql: string,
) => {
  await db.exec("DROP TRIGGER IF EXISTS rule_version_publication_overlap; DROP TRIGGER IF EXISTS rule_version_published_immutable; DROP TRIGGER IF EXISTS rule_version_published_delete_forbidden;");
  await db.exec("DROP TABLE IF EXISTS rule_version; DROP TABLE IF EXISTS calculator_state; DROP TABLE IF EXISTS verification; DROP TABLE IF EXISTS account; DROP TABLE IF EXISTS session; DROP TABLE IF EXISTS user;");
  await db.exec(phase04MigrationSql);
  await db.exec(phase05MigrationSql);
};
