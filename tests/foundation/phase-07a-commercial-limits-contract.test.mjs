import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 07A commercial limits are injected into production persistence routes without Xendit", () => {
  const capabilities = read("apps/web/src/lib/billing/capabilities.ts");
  const calculatorRoute = read("apps/web/src/app/api/calculator-state/[calculatorId]/route.ts");
  const workspaceServices = read("apps/web/src/lib/workspace/route-services.ts");
  const goalRoute = read("apps/web/src/app/api/workspace/goals/route.ts");
  const projectRoute = read("apps/web/src/app/api/workspace/projects/route.ts");
  const persistenceHttp = read("apps/web/src/lib/persistence/http.ts");
  const commercialWorkspaceHttp = read("apps/web/src/lib/workspace/commercial-http.ts");

  assert.match(capabilities, /resolveEffectiveCommercialAccess/);
  assert.doesNotMatch(capabilities, /xendit/i);
  assert.match(calculatorRoute, /createCommercialCapabilityAuthorizer/);
  assert.match(workspaceServices, /createCommercialCapabilityAuthorizer/);
  assert.match(goalRoute, /handleCommercialWorkspaceGoalsRequest/);
  assert.match(projectRoute, /handleCommercialWorkspaceProjectsRequest/);
  assert.match(persistenceHttp, /commercial-limit-reached/);
  assert.match(commercialWorkspaceHttp, /commercial-limit-reached/);
  assert.doesNotMatch(commercialWorkspaceHttp, /xendit/i);
});