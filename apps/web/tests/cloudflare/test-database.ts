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
