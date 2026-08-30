import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { handleBillingCancelRequest, type BillingHttpServices } from "../../src/lib/billing/http";
import { createBillingRepository, type BillingWebhookTransition } from "../../src/lib/billing/repository";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const ownerId = "phase07a-cancel-owner";
const nowMs = 1_800_000_000_000;
const paidThroughAt = 1_802_678_400_000;

const insertUser = async () => env.DB.prepare(
  "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
).bind(ownerId, ownerId, `${ownerId}@example.test`).run();

const event = (planId: string, overrides: Partial<BillingWebhookTransition> = {}): BillingWebhookTransition => ({
  dedupeKey: `${planId}:activated`,
  eventName: "recurring.plan.activated",
  providerPlanId: `provider-${planId}`,
  providerCycleId: null,
  referenceId: `ref-${planId}`,
  providerEventAt: nowMs - 10_000,
  nextStatus: "active",
  latestCycleStatus: "SUCCEEDED",
  currentCycleStartedAt: nowMs - 2_000_000,
  nextCycleAt: paidThroughAt,
  providerCreatedAt: nowMs - 3_000_000,
  providerUpdatedAt: nowMs - 10_000,
  rank: 20,
  ...overrides,
});

beforeEach(async () => {
  await resetCurrentDatabase();
  await insertUser();
});

describe("Phase 07A cancellation persistence", () => {
  it.each(["pro-monthly", "pro-annual"])("freezes authoritative paid-through for %s and preserves it after inactivation", async (planId) => {
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({
      id: `checkout-${planId}`,
      userId: ownerId,
      planId,
      referenceId: `ref-${planId}`,
      now: nowMs - 4_000_000,
    });
    await repo.applyWebhookTransition(event(planId), nowMs - 9_000);

    expect(await repo.markCancellationRequested(ownerId, `provider-${planId}`, nowMs)).toBe(true);
    const frozen = await env.DB.prepare(
      "SELECT cancellation_requested_at AS cancellationRequestedAt, paid_through_at AS paidThroughAt FROM billing_subscription WHERE user_id = ? LIMIT 1",
    ).bind(ownerId).first<{ cancellationRequestedAt: number | null; paidThroughAt: number | null }>();
    expect(frozen).toEqual({ cancellationRequestedAt: nowMs, paidThroughAt });

    await repo.applyWebhookTransition(event(planId, {
      dedupeKey: `${planId}:inactivated`,
      eventName: "recurring.plan.inactivated",
      providerEventAt: nowMs + 10_000,
      nextStatus: "inactive",
      latestCycleStatus: null,
      nextCycleAt: null,
      providerUpdatedAt: nowMs + 10_000,
      rank: 40,
    }), nowMs + 11_000);

    const afterInactivation = await env.DB.prepare(
      "SELECT status, paid_through_at AS paidThroughAt FROM billing_subscription WHERE user_id = ? LIMIT 1",
    ).bind(ownerId).first<{ status: string; paidThroughAt: number | null }>();
    expect(afterInactivation).toEqual({ status: "inactive", paidThroughAt });
  });

  it("freezes paid-through before a provider inactivation webhook can race the cancellation marker", async () => {
    const planId = "pro-monthly";
    const repo = createBillingRepository(env.DB);
    await repo.createCheckoutCorrelation({
      id: `checkout-${planId}`,
      userId: ownerId,
      planId,
      referenceId: `ref-${planId}`,
      now: nowMs - 4_000_000,
    });
    await repo.applyWebhookTransition(event(planId), nowMs - 9_000);

    let providerCalls = 0;
    const services: BillingHttpServices = {
      auth: {
        api: {
          getSession: async () => ({
            user: { id: ownerId, name: "Cancellation owner", email: `${ownerId}@example.test`, emailVerified: true },
          }),
        },
      } as BillingHttpServices["auth"],
      repository: repo,
      plans: { ok: true, plans: [] },
      xendit: {
        createSubscriptionSession: async () => { throw new Error("not used"); },
        updateSubscriptionPlan: async () => { throw new Error("not used"); },
        deactivateSubscription: async () => {
          providerCalls += 1;
          await repo.applyWebhookTransition(event(planId, {
            dedupeKey: `${planId}:inactivated-race`,
            eventName: "recurring.plan.inactivated",
            providerEventAt: nowMs + 10_000,
            nextStatus: "inactive",
            latestCycleStatus: null,
            nextCycleAt: null,
            providerUpdatedAt: nowMs + 10_000,
            rank: 40,
          }), nowMs + 11_000);
        },
      },
      now: () => new Date(nowMs),
    };

    const response = await handleBillingCancelRequest(new Request("https://found.example/api/billing/subscription/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }), services);

    expect(response.status).toBe(200);
    expect(providerCalls).toBe(1);
    const afterRace = await env.DB.prepare(
      "SELECT status, cancellation_requested_at AS cancellationRequestedAt, paid_through_at AS paidThroughAt FROM billing_subscription WHERE user_id = ? LIMIT 1",
    ).bind(ownerId).first<{ status: string; cancellationRequestedAt: number | null; paidThroughAt: number | null }>();
    expect(afterRace).toEqual({ status: "inactive", cancellationRequestedAt: nowMs, paidThroughAt });
  });
});
