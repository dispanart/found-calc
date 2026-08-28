import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";

import { createFoundCalcAuth } from "../../src/lib/auth/server";
import { createCalculatorStateRepository } from "../../src/lib/persistence/repository";
import { handleCalculatorStateRequest, handleGuestClaimRequest } from "../../src/lib/persistence/http";
import { resetPhase04Database } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const state = { calculatorId: "reference.discount" as const, calculatorVersion: "1.0.0", input: { baseAmount: "100.00", discountPercentages: ["10.0000"] } };
const secret = "phase-04-state-api-test-secret-long-enough-12345";

beforeEach(async () => {
  await resetPhase04Database(env.DB, migrationSql);
});

describe("calculator state HTTP boundary", () => {
  it("mints an HttpOnly guest cookie and supports guest load/delete", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL: "http://localhost:3000" });
    const put = await handleCalculatorStateRequest("PUT", new Request("http://localhost:3000/api/calculator-state/reference.discount", {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state),
    }), "reference.discount", { DB: env.DB, auth });
    expect(put.status).toBe(200);
    const setCookie = put.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("found_calc_guest=");
    expect(setCookie).toContain("HttpOnly");
    const guestCookie = setCookie.split(";")[0]!;

    const get = await handleCalculatorStateRequest("GET", new Request("http://localhost:3000/api/calculator-state/reference.discount", { headers: { cookie: guestCookie } }), "reference.discount", { DB: env.DB, auth });
    expect(get.status).toBe(200);
    expect((await get.json()).state).toEqual(state);

    const del = await handleCalculatorStateRequest("DELETE", new Request("http://localhost:3000/api/calculator-state/reference.discount", { method: "DELETE", headers: { cookie: guestCookie } }), "reference.discount", { DB: env.DB, auth });
    expect(del.status).toBe(204);
  });

  it("claims a guest draft into a real Better Auth session and clears the guest cookie", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL: "http://localhost:3000" });
    const guestPut = await handleCalculatorStateRequest("PUT", new Request("http://localhost:3000/api/calculator-state/reference.discount", { method: "PUT", body: JSON.stringify(state) }), "reference.discount", { DB: env.DB, auth });
    const guestCookie = guestPut.headers.get("set-cookie")!.split(";")[0]!;

    const signUp = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Claim User", email: "claim@example.com", password: "claim-password-123" }),
    }));
    expect(signUp.status).toBe(200);
    const payload = await signUp.clone().json() as { user: { id: string } };
    const authCookie = (signUp.headers.get("set-cookie") ?? "").split(";")[0]!;
    expect(authCookie).toContain("=");

    const claim = await handleGuestClaimRequest(new Request("http://localhost:3000/api/guest/claim", {
      method: "POST", headers: { cookie: `${guestCookie}; ${authCookie}` },
    }), { DB: env.DB, auth });
    expect(claim.status).toBe(200);
    expect(claim.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await createCalculatorStateRepository(env.DB).getState("user", payload.user.id, "reference.discount"))?.state).toEqual(state);
  });
});
