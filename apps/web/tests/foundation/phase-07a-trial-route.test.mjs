import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const fromRoot = (path) => resolve(process.cwd(), path);

test("Phase 07A exposes a thin Besties trial App Router endpoint", () => {
  const routePath = fromRoot("apps/web/src/app/api/billing/trial/route.ts");
  assert.equal(existsSync(routePath), true, "expected POST /api/billing/trial route");
  const source = readFileSync(routePath, "utf8");
  assert.match(source, /handleBestiesTrialRequest/);
  assert.match(source, /getBillingTrialRouteServices/);
});

test("Besties trial HTTP domain has no Xendit dependency", () => {
  const source = readFileSync(fromRoot("apps/web/src/lib/billing/trial-http.ts"), "utf8");
  assert.doesNotMatch(source, /xendit/i);
});
