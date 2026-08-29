import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createBillingRepository, type BillingWebhookTransition } from "../../src/lib/billing/repository";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const ownerId = "phase07-owner";
const otherId = "phase07-other";
const insertUser = async (id: string) => env.DB.prepare(
  "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
).bind(id, id, `${id}@example.test`).run();

const event = (overrides: Partial<BillingWebhookTransition> = {}): BillingWebhookTransition => ({
  dedupeKey: "recurring.plan.activated:provider-plan-1:1800000000000",
  eventName: "recurring.plan.activated",
  providerPlanId: "provider-plan-1",
  providerCycleId: null,
  referenceId: "billing-ref-1",
  providerEventAt: 1_800_000_000_000,
  nextStatus: "active",
  latestCycleStatus: null,
  currentCycleStartedAt: null,
  nextCycleAt: null,
  providerCreatedAt: 1_799_999_000_000,
  providerUpdatedAt: 1_800_000_000_000,
  rank: 20,
  ...overrides,
});

beforeEach(async () => {
  await resetCurrentDatabase();
  await insertUser(ownerId);
  await insertUser(otherId);
});

describe("billing repository", () => {
  it("keeps checkout and subscription state scoped to the first-party user", async () => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({ id: "checkout-1", userId: ownerId, planId: "fixture-pro", referenceId: "billing-ref-1", now: 1_799_000_000_000 });
    expect((await repo.getStatusForUser(ownerId)).checkoutPending).toBe(true);
    expect((await repo.getStatusForUser(otherId)).checkoutPending).toBe(false);

    expect(await repo.applyWebhookTransition(event(), 1_800_000_000_100)).toEqual({ duplicate: false, applied: true, matched: true });
    expect((await repo.getStatusForUser(ownerId)).subscription).toMatchObject({ planId: "fixture-pro", status: "active", providerPlanId: "provider-plan-1" });
    expect((await repo.getStatusForUser(otherId)).subscription).toBeNull();
  });

  it("deduplicates webhooks and does not apply a duplicate twice", async () => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({ id: "checkout-1", userId: ownerId, planId: "fixture-pro", referenceId: "billing-ref-1" });
    expect((await repo.applyWebhookTransition(event(), 1_800_000_000_100)).duplicate).toBe(false);
    expect(await repo.applyWebhookTransition(event(), 1_800_000_000_200)).toEqual({ duplicate: true, applied: false, matched: true });
    const count = await env.DB.prepare("SELECT count(*) AS count FROM billing_webhook_inbox").first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  it("uses event rank to break equal provider timestamps without regressing state", async () => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({ id: "checkout-1", userId: ownerId, planId: "fixture-pro", referenceId: "billing-ref-1" });
    expect(await repo.applyWebhookTransition(event(), 1_800_000_000_100)).toMatchObject({ applied: true });

    expect(await repo.applyWebhookTransition(event({
      dedupeKey: "same-time-lower-rank",
      eventName: "recurring.cycle.failed",
      nextStatus: "past_due",
      rank: 10,
    }), 1_800_000_000_200)).toMatchObject({ applied: false, matched: true });
    expect((await repo.getStatusForUser(ownerId)).subscription?.status).toBe("active");

    expect(await repo.applyWebhookTransition(event({
      dedupeKey: "same-time-higher-rank",
      eventName: "recurring.cycle.failed",
      nextStatus: "past_due",
      rank: 30,
    }), 1_800_000_000_300)).toMatchObject({ applied: true, matched: true });
    expect((await repo.getStatusForUser(ownerId)).subscription?.status).toBe("past_due");
  });

  it("does not let stale or post-terminal events regress subscription state", async () => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({ id: "checkout-1", userId: ownerId, planId: "fixture-pro", referenceId: "billing-ref-1" });
    await repo.applyWebhookTransition(event(), 1_800_000_000_100);
    await repo.applyWebhookTransition(event({ dedupeKey: "inactivated", eventName: "recurring.plan.inactivated", providerEventAt: 1_800_000_100_000, nextStatus: "inactive", rank: 40 }), 1_800_000_100_100);
    expect((await repo.getStatusForUser(ownerId)).subscription?.status).toBe("inactive");

    expect(await repo.applyWebhookTransition(event({ dedupeKey: "stale-active", providerEventAt: 1_799_999_999_000 }), 1_800_000_200_000)).toMatchObject({ applied: false, matched: true });
    expect(await repo.applyWebhookTransition(event({ dedupeKey: "later-active", providerEventAt: 1_800_000_300_000 }), 1_800_000_300_100)).toMatchObject({ applied: false, matched: true });
    expect((await repo.getStatusForUser(ownerId)).subscription?.status).toBe("inactive");
  });

  it("records cancellation once without changing the local status", async () => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({ id: "checkout-1", userId: ownerId, planId: "fixture-pro", referenceId: "billing-ref-1" });
    await repo.applyWebhookTransition(event(), 1_800_000_000_100);
    expect(await repo.markCancellationRequested(ownerId, "provider-plan-1", 1_800_000_010_000)).toBe(true);
    expect(await repo.markCancellationRequested(otherId, "provider-plan-1", 1_800_000_020_000)).toBe(false);
    expect((await repo.getStatusForUser(ownerId)).subscription).toMatchObject({ status: "active", cancellationRequestedAt: 1_800_000_010_000 });
  });
});
