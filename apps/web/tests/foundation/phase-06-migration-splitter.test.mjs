import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { splitD1MigrationStatements } from "../cloudflare/sql-statements.ts";

const migration = (name) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), "utf8");

test("test migration splitter matches Wrangler statement boundaries across the migration chain", () => {
  assert.equal(
    splitD1MigrationStatements(migration("0001_phase04_auth_and_calculator_state.sql")).length,
    9,
  );
  assert.equal(
    splitD1MigrationStatements(migration("0002_phase05_rule_platform_admin.sql")).length,
    12,
  );
  assert.equal(
    splitD1MigrationStatements(migration("0003_phase06_workspace.sql")).length,
    16,
  );
});

test("Phase 06 test migration splitter preserves nested CASE inside a trigger", () => {
  const statements = splitD1MigrationStatements(migration("0003_phase06_workspace.sql"));
  const trigger = statements.find((statement) =>
    statement.startsWith("CREATE TRIGGER IF NOT EXISTS workspace_project_invite_redeem_member"),
  );

  assert.ok(trigger);
  assert.match(trigger, /role = CASE[\s\S]*END;[\s\S]*END;$/);
});
