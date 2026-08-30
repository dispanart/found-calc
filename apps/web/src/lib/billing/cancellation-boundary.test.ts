import { describe, expect, it } from "vitest";
import {
  handleBillingCancelRequest,
  type BillingHttpRepository,
  type BillingHttpServices,
} from "./http";
import type { BillingSubscriptionRecord } from "./repository";
import { XenditClientError } from "../xendit/client";

const nowMs = new Date("2026-08-14T10:00:00.000Z").valueOf();
const request = () => new Request("https://found.example/api/billing/subscription/cancel", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

const subscription = (overrides: Partial<BillingSubscriptionRecord> = {}): BillingSubscriptionRecord => ({
  id: "sub-1",
  userId: "user-1",
  planId: "pro-monthly-2026a",
  providerPlanId: "rp-1",
  referenceId: "ref-1",
  status: "active",
  latestCycleStatus: "SUCCEEDED",
  latestEventAt: nowMs - 1_000,
  nextCycleAt: nowMs + 30 * 24 * 60 * 60 * 1000,
  cancellationRequestedAt: null,
  pendingPlanId: null,
  pendingPlanChangeRequestedAt: null,
  ...overrides,
});

const repository = (sub: BillingSubscriptionRecord): BillingHttpRepository => ({
  getStatusForUser: async () => ({ subscription: sub, checkoutPending: false }),
  getTrialForUser: async () => null,
  hasHistoricalPaidSubscription: async () => true,
  createCheckoutCorrelation: async () => undefined,
  attachProviderSession: async () => true,
  expireCheckout: async () => true,
  getSubscriptionForCancellation: async () => sub,
  markCancellationRequested: async () => true,
  clearCancellationRequest: async () => true,
  stagePlanChange: async () => true,
  clearPlanChange: async () => true,
  getEventOwner: async () => null,
  applyWebhookTransition: async () => ({ duplicate: false, applied: true, matched: true }),
});

const services = (sub: BillingSubscriptionRecord, onDeactivate: () => void): BillingHttpServices => ({
  auth: { api: { getSession: async () => ({ user: { id: "user-1", email: "dina@example.test", name: "Dina", emailVerified: true } }) } } as BillingHttpServices["auth"],
  repository: repository(sub),
  plans: { ok: true, plans: [] },
  xendit: {
    createSubscriptionSession: async () => { throw new Error("not used"); },
    updateSubscriptionPlan: async () => { throw new Error("not used"); },
    deactivateSubscription: async () => { onDeactivate(); },
  },
  now: () => new Date(nowMs),
});

type CancellationRollbackRepository = BillingHttpRepository & {
  clearCancellationRequest(userId: string, providerPlanId: string, stagedAt: number, now?: number): Promise<boolean>;
};

const cancellationFailureServices = (
  providerError: XenditClientError,
  calls: string[],
): BillingHttpServices => {
  const sub = subscription();
  const repo = {
    ...repository(sub),
    markCancellationRequested: async () => {
      calls.push("stage");
      return true;
    },
    clearCancellationRequest: async () => {
      calls.push("clear");
      return true;
    },
  } as CancellationRollbackRepository;
  return {
    ...services(sub, () => undefined),
    repository: repo,
    xendit: {
      createSubscriptionSession: async () => { throw new Error("not used"); },
      updateSubscriptionPlan: async () => { throw new Error("not used"); },
      deactivateSubscription: async () => {
        calls.push("provider");
        throw providerError;
      },
    },
  };
};

describe("Phase 07A cancellation paid-through HTTP contract", () => {
  it.each([
    ["missing", null],
    ["expired", nowMs],
    ["past", nowMs - 1],
  ] as const)("fails safely before provider mutation when %s paid-period boundary is unavailable", async (_label, nextCycleAt) => {
    let providerCalls = 0;
    const response = await handleBillingCancelRequest(
      request(),
      services(subscription({ nextCycleAt }), () => { providerCalls += 1; }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "billing-period-unavailable" } });
    expect(providerCalls).toBe(0);
  });

  it("deactivates renewal exactly once when a future authoritative boundary exists", async () => {
    let providerCalls = 0;
    const response = await handleBillingCancelRequest(
      request(),
      services(subscription(), () => { providerCalls += 1; }),
    );
    expect(response.status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("does not call the provider again after cancellation was already requested", async () => {
    let providerCalls = 0;
    const response = await handleBillingCancelRequest(
      request(),
      services(subscription({ cancellationRequestedAt: nowMs - 10_000 }), () => { providerCalls += 1; }),
    );
    expect(response.status).toBe(200);
    expect(providerCalls).toBe(0);
  });

  it("stages the paid-through boundary before provider mutation and rolls it back on definite rejection", async () => {
    const calls: string[] = [];
    const response = await handleBillingCancelRequest(
      request(),
      cancellationFailureServices(new XenditClientError(false), calls),
    );
    expect(response.status).toBe(503);
    expect(calls).toEqual(["stage", "provider", "clear"]);
  });

  it("keeps staged cancellation state when provider mutation may have succeeded", async () => {
    const calls: string[] = [];
    const response = await handleBillingCancelRequest(
      request(),
      cancellationFailureServices(new XenditClientError(true), calls),
    );
    expect(response.status).toBe(503);
    expect(calls).toEqual(["stage", "provider"]);
  });
});
