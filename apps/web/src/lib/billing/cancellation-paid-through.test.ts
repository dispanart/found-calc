import { describe, expect, it } from "vitest";
import type { BillingPlanDefinition } from "./contracts";
import {
  handleBillingCancelRequest,
  handleBillingStatusRequest,
  type BillingHttpRepository,
  type BillingHttpServices,
} from "./http";

const nowMs = Date.parse("2026-08-14T10:00:00.000Z");
const paidThroughAt = Date.parse("2026-09-15T00:00:00.000Z");
const session = { user: { id: "user-1", name: "Dina", email: "dina@example.test", emailVerified: true } };
const proPlan: BillingPlanDefinition = {
  id: "pro-monthly",
  displayName: { id: "Pro", en: "Pro" },
  description: { id: "Legacy reconciliation", en: "Legacy reconciliation" },
  amount: 25000,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount: 1,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements: ["advanced_scenarios", "history_depth"],
};

const subscription = (overrides: Record<string, unknown> = {}) => ({
  id: "sub-1",
  userId: "user-1",
  planId: "pro-monthly",
  providerPlanId: "provider-plan-1",
  referenceId: "billing-ref-1",
  status: "active" as const,
  latestCycleStatus: "SUCCEEDED",
  latestEventAt: nowMs - 1000,
  nextCycleAt: paidThroughAt,
  cancellationRequestedAt: null,
  pendingPlanId: null,
  pendingPlanChangeRequestedAt: null,
  ...overrides,
});

const repository = (overrides: Partial<BillingHttpRepository> = {}): BillingHttpRepository => ({
  getStatusForUser: async () => ({ subscription: null, checkoutPending: false }),
  getTrialForUser: async () => null,
  hasHistoricalPaidSubscription: async () => false,
  createCheckoutCorrelation: async () => undefined,
  attachProviderSession: async () => true,
  expireCheckout: async () => true,
  getSubscriptionForCancellation: async () => null,
  markCancellationRequested: async () => true,
  clearCancellationRequest: async () => true,
  stagePlanChange: async () => true,
  clearPlanChange: async () => true,
  getEventOwner: async () => null,
  applyWebhookTransition: async () => ({ duplicate: false, applied: true, matched: true }),
  ...overrides,
});

const services = (repo: BillingHttpRepository, deactivateSubscription: BillingHttpServices["xendit"]["deactivateSubscription"] = async () => undefined): BillingHttpServices => ({
  auth: { api: { getSession: async () => session } } as BillingHttpServices["auth"],
  repository: repo,
  plans: { ok: true, plans: [proPlan] },
  xendit: {
    createSubscriptionSession: async () => { throw new Error("not used"); },
    updateSubscriptionPlan: async () => undefined,
    deactivateSubscription,
  },
  now: () => new Date(nowMs),
});

const cancelRequest = () => new Request("https://found.example/api/billing/subscription/cancel", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

describe("Phase 07A cancellation paid-through boundary", () => {
  it("fails safely before touching Xendit when no authoritative future cycle boundary exists", async () => {
    let providerCalls = 0;
    let markCalls = 0;
    const repo = repository({
      getSubscriptionForCancellation: async () => subscription({ nextCycleAt: null }) as never,
      markCancellationRequested: async () => { markCalls++; return true; },
    });
    const response = await handleBillingCancelRequest(cancelRequest(), services(repo, async () => { providerCalls++; }));
    expect(response.status).toBe(409);
    expect(providerCalls).toBe(0);
    expect(markCalls).toBe(0);
  });

  it("keeps paid Besties access after provider inactivation until paidThroughAt", async () => {
    const repo = repository({
      getStatusForUser: async () => ({
        checkoutPending: false,
        subscription: subscription({ status: "inactive", paidThroughAt }) as never,
      }),
      hasHistoricalPaidSubscription: async () => true,
    });
    const response = await handleBillingStatusRequest(
      new Request("https://found.example/api/billing/status"),
      services(repo),
    );
    const payload = await response.json() as { billing: { commercial: { tier: string; source: string; accessUntil: number | null } } };
    expect(response.status).toBe(200);
    expect(payload.billing.commercial).toMatchObject({ tier: "besties", source: "paid", accessUntil: paidThroughAt });
  });

  it("does not deactivate twice after cancellation has already been requested", async () => {
    let providerCalls = 0;
    const repo = repository({
      getSubscriptionForCancellation: async () => subscription({ cancellationRequestedAt: nowMs - 1000 }) as never,
    });
    const response = await handleBillingCancelRequest(cancelRequest(), services(repo, async () => { providerCalls++; }));
    expect(response.status).toBe(200);
    expect(providerCalls).toBe(0);
  });
});