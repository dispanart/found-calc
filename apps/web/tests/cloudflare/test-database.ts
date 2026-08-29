import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";

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

type D1Migrations = Parameters<typeof applyD1Migrations>[1];

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migrations;
  }
}

export const resetCurrentDatabase = async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
};

export const resetPhase04Database = async (db: D1Database, migrationSql: string) => {
  const dropStatements = phase04TablesInDropOrder.map((table) =>
    db.prepare(`DROP TABLE IF EXISTS ${table}`),
  );
  const migrationStatements = splitMigrationStatements(migrationSql).map((statement) =>
    db.prepare(statement),
  );

  await db.batch([...dropStatements, ...migrationStatements]);
};
