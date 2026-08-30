import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createFoundCalcAuth } from "../../src/lib/auth/server";
import {
  createCommercialCapabilityAuthorizer,
  type CommercialCapabilityAuthorizer,
  type CommercialPersistenceLimits,
} from "../../src/lib/billing/capabilities";
import { handleCalculatorStateRequest } from "../../src/lib/persistence/http";
import {
  handleCommercialWorkspaceGoalRequest,
  handleCommercialWorkspaceGoalsRequest,
  handleCommercialWorkspaceProjectRequest,
  handleCommercialWorkspaceProjectsRequest,
} from "../../src/lib/workspace/commercial-http";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const secret = "phase-07a-commercial-limits-test-secret-long-enough";
const baseURL = "http://localhost:3000";
const nowMs = Date.parse("2026-08-30T02:30:00.000Z");

const discountState = (baseAmount = "100.00") => ({
  calculatorId: "reference.discount" as const,
  calculatorVersion: "1.0.0",
  input: { baseAmount, discountPercentages: ["10.0000"] },
});
const marginState = {
  calculatorId: "reference.business-margin" as const,
  calculatorVersion: "1.0.0",
  input: {
    sellingPrice: "125.00",
    productCost: "80.00",
    variableSellingCostPerOrder: "5.00",
    scenarioVariableSellingCostPerOrder: "4.00",
  },
};
const syntheticState = {
  calculatorId: "reference.synthetic-rule" as const,
  calculatorVersion: "1.0.0",
  input: { baseAmount: "250.00", effectiveDate: "2026-08-30" },
};

const signUp = async (auth: ReturnType<typeof createFoundCalcAuth>, email: string) => {
  const response = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL },
    body: JSON.stringify({ name: "Limits User", email, password: "phase-07a-limits-password" }),
  }));
  expect(response.status).toBe(200);
  const payload = await response.clone().json() as { user: { id: string } };
  return { id: payload.user.id, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0]! };
};

const request = (path: string, method: string, cookie: string, body?: unknown) => new Request(`${baseURL}${path}`, {
  method,
  headers: { cookie, origin: baseURL, ...(body === undefined ? {} : { "content-type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const fixedCapabilities = (limits: CommercialPersistenceLimits): CommercialCapabilityAuthorizer => ({
  getLimits: async () => limits,
});

const insertTrial = async (userId: string, startedAt: number, endsAt: number) => {
  await env.DB.prepare(`
    INSERT INTO billing_trial (user_id, trial_tier, started_at, ends_at, converted_at)
    VALUES (?, 'besties', ?, ?, NULL)
  `).bind(userId, startedAt, endsAt).run();
};

const insertPaidSubscription = async (userId: string, planId: string) => {
  await env.DB.prepare(`
    INSERT INTO billing_subscription (
      id, user_id, plan_id, provider_plan_id, reference_id, status,
      latest_cycle_status, latest_event_at, latest_event_rank, next_cycle_at, paid_through_at
    ) VALUES (?, ?, ?, ?, ?, 'active', 'SUCCEEDED', ?, 10, ?, ?)
  `).bind(
    `sub-${userId}`,
    userId,
    planId,
    `provider-${userId}`,
    `ref-${userId}`,
    nowMs - 1_000,
    nowMs + 30 * 24 * 60 * 60 * 1000,
    nowMs + 30 * 24 * 60 * 60 * 1000,
  ).run();
};

beforeEach(async () => {
  await resetCurrentDatabase();
});

describe("Phase 07A Friends commercial persistence limits", () => {
  it("blocks only new Saved Calculations at an injected cap while preserving reads and existing updates", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "saved-limits@example.test");
    const services = {
      DB: env.DB,
      auth,
      capabilities: fixedCapabilities({ savedCalculations: 2, activeGoals: 1, activeProjects: 1 }),
    };

    expect((await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.discount", "PUT", user.cookie, discountState()),
      "reference.discount",
      services,
    )).status).toBe(200);
    expect((await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.business-margin", "PUT", user.cookie, marginState),
      "reference.business-margin",
      services,
    )).status).toBe(200);

    const readExisting = await handleCalculatorStateRequest(
      "GET",
      request("/api/calculator-state/reference.discount", "GET", user.cookie),
      "reference.discount",
      services,
    );
    expect(readExisting.status).toBe(200);

    const updateExisting = await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.discount", "PUT", user.cookie, discountState("175.00")),
      "reference.discount",
      services,
    );
    expect(updateExisting.status).toBe(200);

    const blockedThird = await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.synthetic-rule", "PUT", user.cookie, syntheticState),
      "reference.synthetic-rule",
      services,
    );
    expect(blockedThird.status).toBe(409);
    expect(await blockedThird.json()).toEqual({ error: { code: "commercial-limit-reached" } });

    const unlimitedServices = {
      DB: env.DB,
      auth,
      capabilities: fixedCapabilities({ savedCalculations: null, activeGoals: null, activeProjects: null }),
    };
    expect((await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.synthetic-rule", "PUT", user.cookie, syntheticState),
      "reference.synthetic-rule",
      unlimitedServices,
    )).status).toBe(200);

    const preservedCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM calculator_state WHERE owner_type = 'user' AND owner_id = ?",
    ).bind(user.id).first<{ count: number }>();
    expect(preservedCount?.count).toBe(3);

    const overLimitUpdate = await handleCalculatorStateRequest(
      "PUT",
      request("/api/calculator-state/reference.discount", "PUT", user.cookie, discountState("225.00")),
      "reference.discount",
      services,
    );
    expect(overLimitUpdate.status).toBe(200);
    const afterUpdateCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM calculator_state WHERE owner_type = 'user' AND owner_id = ?",
    ).bind(user.id).first<{ count: number }>();
    expect(afterUpdateCount?.count).toBe(3);
  });

  it("publishes Friends limit 5 and resolves trial/paid precedence entirely from first-party D1 state", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const friends = await signUp(auth, "friends-limits@example.test");
    const trial = await signUp(auth, "trial-limits@example.test");
    const besties = await signUp(auth, "besties-limits@example.test");
    const family = await signUp(auth, "family-limits@example.test");
    await insertTrial(trial.id, nowMs - 1_000, nowMs + 14 * 24 * 60 * 60 * 1000);
    await insertPaidSubscription(besties.id, "pro-monthly-2026a");
    await insertPaidSubscription(family.id, "business-monthly-2026a");

    const capabilities = createCommercialCapabilityAuthorizer(env.DB, () => new Date(nowMs));
    await expect(capabilities.getLimits(friends.id)).resolves.toEqual({ savedCalculations: 5, activeGoals: 1, activeProjects: 1 });
    await expect(capabilities.getLimits(trial.id)).resolves.toEqual({ savedCalculations: null, activeGoals: null, activeProjects: null });
    await expect(capabilities.getLimits(besties.id)).resolves.toEqual({ savedCalculations: null, activeGoals: null, activeProjects: null });
    await expect(capabilities.getLimits(family.id)).resolves.toEqual({ savedCalculations: null, activeGoals: null, activeProjects: null });

    await env.DB.prepare("UPDATE billing_trial SET ends_at = ?, started_at = ? WHERE user_id = ?")
      .bind(nowMs - 1, nowMs - 14 * 24 * 60 * 60 * 1000, trial.id).run();
    await expect(capabilities.getLimits(trial.id)).resolves.toEqual({ savedCalculations: 5, activeGoals: 1, activeProjects: 1 });
  });

  it("atomically caps Friends active Goals and Projects while archived/completed records stay usable", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "workspace-limits@example.test");
    const services = {
      DB: env.DB,
      auth,
      capabilities: createCommercialCapabilityAuthorizer(env.DB, () => new Date(nowMs)),
    };

    const [goalA, goalB] = await Promise.all([
      handleCommercialWorkspaceGoalsRequest("POST", request("/api/workspace/goals", "POST", user.cookie, { title: "Goal A", status: "active" }), services),
      handleCommercialWorkspaceGoalsRequest("POST", request("/api/workspace/goals", "POST", user.cookie, { title: "Goal B", status: "active" }), services),
    ]);
    expect([goalA.status, goalB.status].sort()).toEqual([201, 409]);
    const activeGoalResponse = goalA.status === 201 ? goalA : goalB;
    const activeGoal = (await activeGoalResponse.json() as { goal: { id: string } }).goal;

    const archivedGoalResponse = await handleCommercialWorkspaceGoalsRequest(
      "POST",
      request("/api/workspace/goals", "POST", user.cookie, { title: "Archived Goal", status: "archived" }),
      services,
    );
    expect(archivedGoalResponse.status).toBe(201);
    const archivedGoal = (await archivedGoalResponse.json() as { goal: { id: string } }).goal;
    const blockedGoalReactivation = await handleCommercialWorkspaceGoalRequest(
      "PATCH",
      request(`/api/workspace/goals/${archivedGoal.id}`, "PATCH", user.cookie, { status: "active" }),
      archivedGoal.id,
      services,
    );
    expect(blockedGoalReactivation.status).toBe(409);
    expect(await blockedGoalReactivation.json()).toEqual({ error: { code: "commercial-limit-reached" } });

    expect((await handleCommercialWorkspaceGoalRequest(
      "PATCH",
      request(`/api/workspace/goals/${activeGoal.id}`, "PATCH", user.cookie, { status: "completed" }),
      activeGoal.id,
      services,
    )).status).toBe(200);
    expect((await handleCommercialWorkspaceGoalRequest(
      "PATCH",
      request(`/api/workspace/goals/${archivedGoal.id}`, "PATCH", user.cookie, { status: "active" }),
      archivedGoal.id,
      services,
    )).status).toBe(200);

    const [projectA, projectB] = await Promise.all([
      handleCommercialWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", user.cookie, { name: "Project A", status: "active" }), services),
      handleCommercialWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", user.cookie, { name: "Project B", status: "active" }), services),
    ]);
    expect([projectA.status, projectB.status].sort()).toEqual([201, 409]);
    const activeProjectResponse = projectA.status === 201 ? projectA : projectB;
    const activeProject = (await activeProjectResponse.json() as { project: { id: string } }).project;

    const archivedProjectResponse = await handleCommercialWorkspaceProjectsRequest(
      "POST",
      request("/api/workspace/projects", "POST", user.cookie, { name: "Archived Project", status: "archived" }),
      services,
    );
    expect(archivedProjectResponse.status).toBe(201);
    const archivedProject = (await archivedProjectResponse.json() as { project: { id: string } }).project;
    const blockedProjectReactivation = await handleCommercialWorkspaceProjectRequest(
      "PATCH",
      request(`/api/workspace/projects/${archivedProject.id}`, "PATCH", user.cookie, { status: "active" }),
      archivedProject.id,
      services,
    );
    expect(blockedProjectReactivation.status).toBe(409);
    expect(await blockedProjectReactivation.json()).toEqual({ error: { code: "commercial-limit-reached" } });

    expect((await handleCommercialWorkspaceProjectRequest(
      "PATCH",
      request(`/api/workspace/projects/${activeProject.id}`, "PATCH", user.cookie, { status: "archived" }),
      activeProject.id,
      services,
    )).status).toBe(200);
    expect((await handleCommercialWorkspaceProjectRequest(
      "PATCH",
      request(`/api/workspace/projects/${archivedProject.id}`, "PATCH", user.cookie, { status: "active" }),
      archivedProject.id,
      services,
    )).status).toBe(200);
  });
});