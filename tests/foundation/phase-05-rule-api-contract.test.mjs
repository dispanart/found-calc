import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 05 enables Better Auth admin bootstrap without client token storage", () => {
  const auth = read("apps/web/src/lib/auth/server.ts");
  const example = read("apps/web/.dev.vars.example");
  assert.match(auth, /better-auth\/plugins/);
  assert.match(auth, /admin\(/);
  assert.match(auth, /BETTER_AUTH_ADMIN_USER_IDS/);
  assert.match(example, /BETTER_AUTH_ADMIN_USER_IDS=/);
  assert.doesNotMatch(auth, /localStorage|sessionStorage/);
});

test("Phase 05 exposes published rule reads and protected admin mutations", () => {
  for (const path of [
    "apps/web/src/lib/rules/http.ts",
    "apps/web/src/app/api/rules/[ruleId]/versions/route.ts",
    "apps/web/src/app/api/admin/rule-versions/route.ts",
    "apps/web/src/app/api/admin/rule-versions/[id]/publish/route.ts",
  ]) assert.equal(existsSync(url(path)), true, `${path} must exist`);

  const http = read("apps/web/src/lib/rules/http.ts");
  assert.match(http, /authentication-required/);
  assert.match(http, /admin-required/);
  assert.match(http, /MAX_RULE_REQUEST_BYTES/);
  assert.match(http, /listPublishedVersions/);
  assert.match(http, /listAdminVersions/);
  assert.doesNotMatch(http, /calculateSyntheticRuleAmount|multiplyDecimal|divideDecimal/);
});
