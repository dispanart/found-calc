import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 04 state API uses explicit guest ownership and never calculates server-side", () => {
  const http = read("apps/web/src/lib/persistence/http.ts");
  const stateRoute = read("apps/web/src/app/api/calculator-state/[calculatorId]/route.ts");
  const claimRoute = read("apps/web/src/app/api/guest/claim/route.ts");

  assert.match(http, /found_calc_guest/);
  assert.match(http, /HttpOnly/);
  assert.match(http, /SameSite=Lax/);
  assert.match(http, /MAX_PERSISTED_STATE_BYTES/);
  assert.match(http, /getSession/);
  assert.match(http, /claimGuestStates/);
  assert.doesNotMatch(http, /calculateDiscount|calculateBusinessMargin|calculateSyntheticRuleAmount|multiplyDecimal|divideDecimal/);
  assert.match(stateRoute, /export async function GET/);
  assert.match(stateRoute, /export async function PUT/);
  assert.match(stateRoute, /export async function DELETE/);
  assert.match(claimRoute, /export async function POST/);
});
