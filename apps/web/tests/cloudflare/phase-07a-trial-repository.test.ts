import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import {
  BillingTrialNotEligibleError,
  BESTIES_TRIAL_DURATION_MS,
  createBillingRepository,
} from "../../src/lib/billing/repository";
import phase07aMigrationSql from "../../migrations/0005_phase07a_commercial_auth_amendment.sql?raw";
import { resetCurrentDatabase, splitD1MigrationStatements } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const userId = "phase07a-trial-user";
const otherUserId = "phase07a-trial-other";
const insertUser = async (id: string) => env.DB.prepare(
  "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
).bind(id, id, `${id}@example.test`).run();

const applyPhase07a = async () => {
  const statements = splitD1MigrationStatements(phase07aMigrationSql).map((statement) => env.DB.prepare(statement));
  if (statements.length > 0) await env.DB.batch(statements);
};

beforeEach(async () => {
  await resetCurrentDatabase();
  await applyPhase07a();
  await insertUser(userId);
  await insertUser(otherUserId);
});

describe("Phase 07A Besties trial repository", () => {
  it("starts exactly one 14 x 24 hour trial from the explicit server timestamp", async () => {
    const repo = createBillingRepository(env.DB);
    const now = 1_800_000_000_000;
    const result = await repo.startBestiesTrial(userId, now);

    expect(result.started).toBe(true);
    expect(result.trial).toEqual({
      userId,
      trialTier: "besties",
      startedAt: now,
      endsAt: now + 14 * 24 * 60 * 60 * 1000,
      convertedAt: null,
    });
    expect(BESTIES_TRIAL_DURATION_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("never resets or extends a consumed trial", async () => {
    const repo = createBillingRepository(env.DB);
    const first = await repo.startBestiesTrial(userId, 1_800_000_000_000);
    const second = await repo.startBestiesTrial(userId, 1_900_000_000_000);

    expect(second.started).toBe(false);
    expect(second.trial).toEqual(first.trial);
  });

  it("resolves concurrent duplicate starts to one persisted trial", async () => {
    const repo = createBillingRepository(env.DB);
    const now = 1_800_000_000_000;
    const attempts = await Promise.all([
      repo.startBestiesTrial(userId, now),
      repo.startBestiesTrial(userId, now),
    ]);

    expect(attempts.filter((attempt) => attempt.started)).toHaveLength(1);
    expect(attempts[0]?.trial).toEqual(attempts[1]?.trial);
    const count = await env.DB.prepare("SELECT count(*) AS count FROM billing_trial WHERE user_id = ?").bind(userId).first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  it("rejects introductory trial activation after any historical paid subscription", async () => {
    await env.DB.prepare(`
      INSERT INTO billing_subscription
        (id, user_id, plan_id, provider_plan_id, reference_id, status, latest_event_at, latest_event_rank, created_at, updated_at)
      VALUES (?, ?, 'pro-monthly', ?, ?, 'inactive', 100, 40, 100, 100)
    `).bind("historical-paid", userId, "historical-provider-plan", "historical-reference").run();

    const repo = createBillingRepository(env.DB);
    expect(await repo.hasHistoricalPaidSubscription(userId)).toBe(true);
    expect(await repo.hasHistoricalPaidSubscription(otherUserId)).toBe(false);
    await expect(repo.startBestiesTrial(userId, 1_800_000_000_000)).rejects.toBeInstanceOf(BillingTrialNotEligibleError);
    expect(await repo.getTrialForUser(userId)).toBeNull();
  });

  it("keeps a converted trial permanently consumed", async () => {
    const repo = createBillingRepository(env.DB);
    const first = await repo.startBestiesTrial(userId, 1_800_000_000_000);
    await repo.markTrialConverted(userId, 1_800_100_000_000);
    await repo.markTrialConverted(userId, 1_800_200_000_000);

    const converted = await repo.getTrialForUser(userId);
    expect(converted).toMatchObject({ convertedAt: 1_800_100_000_000 });

    const repeated = await repo.startBestiesTrial(userId, 1_900_000_000_000);
    expect(repeated.started).toBe(false);
    expect(repeated.trial.startedAt).toBe(first.trial.startedAt);
    expect(repeated.trial.endsAt).toBe(first.trial.endsAt);
    expect(repeated.trial.convertedAt).toBe(1_800_100_000_000);
  });
});
