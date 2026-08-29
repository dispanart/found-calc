import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 06 adds a separate workspace domain without reinterpreting Phase 04 calculator_state", () => {
  const migrationPath = "apps/web/migrations/0003_phase06_workspace.sql";
  const contractsPath = "apps/web/src/lib/workspace/contracts.ts";
  const repositoryPath = "apps/web/src/lib/workspace/repository.ts";
  assert.equal(existsSync(url(migrationPath)), true, `${migrationPath} must exist`);
  assert.equal(existsSync(url(contractsPath)), true, `${contractsPath} must exist`);
  assert.equal(existsSync(url(repositoryPath)), true, `${repositoryPath} must exist`);

  const migration = read(migrationPath);
  for (const table of [
    "user_profile",
    "workspace_goal",
    "workspace_project",
    "workspace_project_member",
    "workspace_project_invite",
    "workspace_calculation",
  ]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.doesNotMatch(migration, /ALTER TABLE calculator_state/i);
});

test("Phase 06 workspace adapters cannot become calculator truth or auth-token storage", () => {
  for (const path of [
    "apps/web/src/lib/workspace/repository.ts",
    "apps/web/src/lib/workspace/http.ts",
    "apps/web/src/lib/workspace/client.ts",
  ]) {
    assert.equal(existsSync(url(path)), true, `${path} must exist`);
    const source = read(path);
    assert.doesNotMatch(source, /calculateDiscount|calculateBusinessMargin|calculateSyntheticRuleAmount|multiplyDecimal|divideDecimal/);
    assert.doesNotMatch(source, /localStorage[^\n]*(token|session)|session[^\n]*localStorage/i);
  }
});

test("Phase 06 exposes protected workspace routes and excludes Phase 07+ billing scope", () => {
  const requiredRoutes = [
    "apps/web/src/app/api/workspace/profile/route.ts",
    "apps/web/src/app/api/workspace/goals/route.ts",
    "apps/web/src/app/api/workspace/projects/route.ts",
    "apps/web/src/app/api/workspace/invites/redeem/route.ts",
    "apps/web/src/app/api/workspace/calculations/route.ts",
  ];
  for (const path of requiredRoutes) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const migration = read("apps/web/migrations/0003_phase06_workspace.sql");
  assert.doesNotMatch(migration, /xendit|subscription|invoice|entitlement|payment_webhook|analytics|embedding|vector/i);
});
