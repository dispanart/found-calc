import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import phase04MigrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";
import phase05MigrationSql from "../../migrations/0002_phase05_rule_platform_admin.sql?raw";

import { createFoundCalcAuth } from "../../src/lib/auth/server";
import {
  handleAdminRulePublishRequest,
  handleAdminRuleVersionsRequest,
  handlePublishedRuleVersionsRequest,
} from "../../src/lib/rules/http";
import { resetPhase05Database } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const secret = "phase-05-rule-api-test-secret-that-is-long-enough";
const baseURL = "http://localhost:3000";
const draft = (versionId = "2027-a", effectiveFrom = "2027-01-01") => ({
  ruleId: "reference.synthetic-rate",
  versionId,
  effectiveFrom,
  effectiveUntil: "2027-12-31",
  payload: { ratePercent: "8.25" },
  provenance: { sourceId: "synthetic-admin-test", sourceUrl: "https://example.test/rule" },
});

const signUp = async (auth: ReturnType<typeof createFoundCalcAuth>, email: string) => {
  const response = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Phase Five", email, password: "phase-five-password-123" }),
  }));
  expect(response.status).toBe(200);
  const payload = await response.clone().json() as { user: { id: string } };
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0]!;
  return { id: payload.user.id, cookie };
};

beforeEach(async () => {
  await resetPhase05Database(env.DB, phase04MigrationSql, phase05MigrationSql);
});

describe("rule HTTP boundary", () => {
  it("returns 401 signed out and 403 for a signed-in ordinary user", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth, adminUserIds: [] as readonly string[] };
    const signedOut = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", body: JSON.stringify(draft()),
    }), services);
    expect(signedOut.status).toBe(401);

    const user = await signUp(auth, "ordinary@example.com");
    const forbidden = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify(draft()),
    }), services);
    expect(forbidden.status).toBe(403);
  });

  it("allows a configured admin, validates bodies, and maps duplicate/overlap conflicts", async () => {
    const bootstrapAuth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(bootstrapAuth, "admin@example.com");
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL, adminUserIds: [user.id] });
    const services = { DB: env.DB, auth, adminUserIds: [user.id] };

    const invalid = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify({ nope: true }),
    }), services);
    expect(invalid.status).toBe(400);

    const create = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify(draft()),
    }), services);
    expect(create.status).toBe(201);
    const created = await create.json() as { version: { id: string; status: string } };
    expect(created.version.status).toBe("draft");

    const duplicate = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify(draft()),
    }), services);
    expect(duplicate.status).toBe(409);

    const overlapCreate = await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify(draft("2026-overlap", "2026-06-01")),
    }), services);
    expect(overlapCreate.status).toBe(201);
    const overlap = await overlapCreate.json() as { version: { id: string } };
    const conflict = await handleAdminRulePublishRequest(new Request(`${baseURL}/api/admin/rule-versions/${overlap.version.id}/publish`, {
      method: "POST", headers: { cookie: user.cookie },
    }), overlap.version.id, services);
    expect(conflict.status).toBe(409);
  });

  it("public feed includes published versions and never exposes drafts or audit actors", async () => {
    const bootstrapAuth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(bootstrapAuth, "feed-admin@example.com");
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL, adminUserIds: [user.id] });
    await handleAdminRuleVersionsRequest("POST", new Request(`${baseURL}/api/admin/rule-versions`, {
      method: "POST", headers: { cookie: user.cookie }, body: JSON.stringify(draft()),
    }), { DB: env.DB, auth, adminUserIds: [user.id] });

    const response = await handlePublishedRuleVersionsRequest("reference.synthetic-rate", { DB: env.DB });
    expect(response.status).toBe(200);
    const payload = await response.json() as { versions: Array<Record<string, unknown>> };
    expect(payload.versions.map((version) => version.versionId)).toEqual(["2025-a", "2026-a"]);
    expect(payload.versions.every((version) => !("status" in version) && !("createdByUserId" in version) && !("publishedByUserId" in version))).toBe(true);
  });
});
