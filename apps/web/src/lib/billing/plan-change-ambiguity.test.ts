import { describe, expect, it } from "vitest";
import type { BillingPlanDefinition } from "./contracts";
import { handleBillingChangeRequest, type BillingHttpServices } from "./http";
import { XenditClientError } from "../xendit/client";

const currentPlan: BillingPlanDefinition = {
  id: "pro-monthly",
  displayName: { id: "Pro", en: "Pro" },
  description: { id: "Bulanan", en: "Monthly" },
  amount: 25_000,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount: 1,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements: ["pro.feature"],
};

const targetPlan: BillingPlanDefinition = {
  ...currentPlan,
  id: "pro-annual",
  description: { id: "Tahunan", en: "Annual" },
  amount: 250_000,
  intervalCount: 12,
};

const request = new Request("https://found.example/api/billing/subscription/change", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ planId: targetPlan.id }),
});

describe("billing plan-change provider ambiguity", () => {
  it("keeps the staged target when a provider mutation may already have been applied", async () => {
    let clearCalls = 0;
    const uncertainProviderError = Object.assign(new XenditClientError(), { requestMayHaveSucceeded: true });
    const services: BillingHttpServices = {
      auth: { api: { getSession: async () => ({ user: { id: "user-1", name: "Dina", email: "dina@example.test" } }) } } as BillingHttpServices["auth"],
      repository: {
        getStatusForUser: async () => ({
          checkoutPending: false,
          subscription: {
            id: "sub-1",
            userId: "user-1",
            planId: currentPlan.id,
            providerPlanId: "rp-1",
            referenceId: "ref-1",
            status: "active",
            latestCycleStatus: "SUCCEEDED",
            latestEventAt: 1,
            nextCycleAt: null,
            cancellationRequestedAt: null,
            pendingPlanId: null,
            pendingPlanChangeRequestedAt: null,
          },
        }),
        createCheckoutCorrelation: async () => undefined,
        attachProviderSession: async () => true,
        expireCheckout: async () => true,
        getSubscriptionForCancellation: async () => null,
        markCancellationRequested: async () => true,
        stagePlanChange: async () => true,
        clearPlanChange: async () => { clearCalls += 1; return true; },
        getEventOwner: async () => null,
        applyWebhookTransition: async () => ({ duplicate: false, applied: false, matched: true }),
      },
      plans: { ok: true, plans: [currentPlan, targetPlan] },
      xendit: {
        createSubscriptionSession: async () => { throw new Error("not used"); },
        updateSubscriptionPlan: async () => { throw uncertainProviderError; },
        deactivateSubscription: async () => undefined,
      },
      publicAppOrigin: "https://found.example",
      webhookToken: "test-webhook-token-with-enough-entropy",
      now: () => new Date("2026-08-29T10:00:00.000Z"),
    };

    const response = await handleBillingChangeRequest(request, services);

    expect(response.status).toBe(503);
    expect(clearCalls).toBe(0);
  });
});
