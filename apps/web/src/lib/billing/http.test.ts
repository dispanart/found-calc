import { describe, expect, it } from "vitest";
import type { BillingPlanDefinition } from "./contracts";
import {
  handleBillingCancelRequest,
  handleBillingChangeRequest,
  handleBillingCheckoutRequest,
  handleBillingStatusRequest,
  handleBillingWebhookRequest,
  type BillingHttpRepository,
  type BillingHttpServices,
} from "./http";

const plan: BillingPlanDefinition = {
  id: "fixture-pro", displayName: { id: "Fixture Pro", en: "Fixture Pro" }, description: { id: "Hanya pengujian", en: "Testing only" },
  amount: 10000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["fixture.export"],
};
const session = { user: { id: "user-1", name: "Dina", email: "dina@example.test" } };
const baseRepo = (): BillingHttpRepository => ({
  getStatusForUser: async () => ({ subscription: null, checkoutPending: false }),
  getTrialForUser: async () => null,
  hasHistoricalPaidSubscription: async () => false,
  createCheckoutCorrelation: async () => undefined,
  attachProviderSession: async () => true, expireCheckout: async () => true, getSubscriptionForCancellation: async () => null,
  markCancellationRequested: async () => true, clearCancellationRequest: async () => true, stagePlanChange: async () => true, clearPlanChange: async () => true, getEventOwner: async () => null, applyWebhookTransition: async () => ({ duplicate: false, applied: true, matched: true }),
});
const services = (overrides: Partial<BillingHttpServices> = {}): BillingHttpServices => ({
  auth: { api: { getSession: async () => session } } as BillingHttpServices["auth"], repository: baseRepo(), plans: { ok: true, plans: [plan] },
  publicAppOrigin: "https://found.example", webhookToken: "test-webhook-token-with-enough-entropy",
  xendit: { createSubscriptionSession: async (input) => ({ paymentSessionId: "ps-1", recurringPlanId: "rp-1", referenceId: input.referenceId, paymentLinkUrl: "https://payments.xendit.co/session/ps-1" }), updateSubscriptionPlan: async () => undefined, deactivateSubscription: async () => undefined },
  now: () => new Date("2026-08-14T10:00:00.000Z"), randomUUID: () => "00000000-0000-4000-8000-000000000001", ...overrides,
});
const request = (path: string, body: unknown, headers: HeadersInit = {}) => new Request(`https://found.example${path}`, { method: "POST", headers: { "content-type": "application/json", ...Object.fromEntries(new Headers(headers).entries()) }, body: JSON.stringify(body) });
const webhook = { event: "recurring.plan.activated", created: "2026-08-14T10:01:00.000Z", data: { id: "rp-1", reference_id: "fcbilling00000000000040008000000000000001", status: "ACTIVE", amount: 10000, currency: "IDR", created: "2026-08-14T10:00:30.000Z", updated: "2026-08-14T10:01:00.000Z" } };

describe("billing HTTP boundary", () => {
  it("requires authentication for browser billing APIs", async () => {
    const signedOut = services({ auth: { api: { getSession: async () => null } } as BillingHttpServices["auth"] });
    expect((await handleBillingStatusRequest(new Request("https://found.example/api/billing/status"), signedOut)).status).toBe(401);
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "id" }), signedOut)).status).toBe(401);
    expect((await handleBillingCancelRequest(request("/api/billing/subscription/cancel", {}), signedOut)).status).toBe(401);
    expect((await handleBillingChangeRequest(request("/api/billing/subscription/change", { planId: "fixture-pro" }), signedOut)).status).toBe(401);
  });

  it("keeps status local and fail-closed entitlements", async () => {
    let providerCalls = 0;
    const svc = services({ repository: { ...baseRepo(), getStatusForUser: async () => ({ checkoutPending: false, subscription: { id: "sub-1", userId: "user-1", planId: "fixture-pro", providerPlanId: "rp-1", referenceId: "ref", status: "active", latestCycleStatus: null, latestEventAt: 1, nextCycleAt: null, cancellationRequestedAt: null, pendingPlanId: null, pendingPlanChangeRequestedAt: null } }) }, xendit: { createSubscriptionSession: async () => { providerCalls++; throw new Error(); }, updateSubscriptionPlan: async () => undefined, deactivateSubscription: async () => { providerCalls++; } } });
    const response = await handleBillingStatusRequest(new Request("https://found.example/api/billing/status"), svc);
    const payload = await response.json() as { billing: { entitlements: string[] } };
    expect(response.status).toBe(200); expect(payload.billing.entitlements).toEqual(["fixture.export"]); expect(providerCalls).toBe(0); expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed for bad checkout input/config/conflicts and exposes only hosted URL", async () => {
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "missing", locale: "id" }), services())).status).toBe(404);
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "id", providerPlanId: "forged" }), services())).status).toBe(400);
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "id" }), services({ plans: { ok: false, code: "billing-unavailable" } }))).status).toBe(503);
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "id" }), services({ repository: { ...baseRepo(), getStatusForUser: async () => ({ subscription: null, checkoutPending: true }) } }))).status).toBe(409);
    expect((await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "fr" }), services())).status).toBe(400);
    let providerInput: Parameters<BillingHttpServices["xendit"]["createSubscriptionSession"]>[0] | null = null;
    const response = await handleBillingCheckoutRequest(request("/api/billing/checkout", { planId: "fixture-pro", locale: "en" }), services({
      xendit: {
        createSubscriptionSession: async (input) => {
          providerInput = input;
          return { paymentSessionId: "ps-1", recurringPlanId: "rp-1", referenceId: input.referenceId, paymentLinkUrl: "https://payments.xendit.co/session/ps-1" };
        },
        updateSubscriptionPlan: async () => undefined, deactivateSubscription: async () => undefined,
      },
    }));
    expect(providerInput).toMatchObject({
      locale: "en",
      successReturnUrl: "https://found.example/en/workspace/billing?checkout=success",
      cancelReturnUrl: "https://found.example/en/workspace/billing?checkout=cancelled",
    });
    expect(await response.json()).toEqual({ checkout: { url: "https://payments.xendit.co/session/ps-1" } });
  });

  it("does not let cancellation input select provider identity", async () => {
    const sub = { id: "sub-1", userId: "user-1", planId: "fixture-pro", providerPlanId: "rp-secret", referenceId: "ref", status: "active" as const, latestCycleStatus: null, latestEventAt: 1, nextCycleAt: 1_800_000_100_000, cancellationRequestedAt: null, pendingPlanId: null, pendingPlanChangeRequestedAt: null };
    let deactivated = "";
    const svc = services({ repository: { ...baseRepo(), getSubscriptionForCancellation: async () => sub }, xendit: { createSubscriptionSession: async () => { throw new Error(); }, updateSubscriptionPlan: async () => undefined, deactivateSubscription: async (id) => { deactivated = id; } } });
    expect((await handleBillingCancelRequest(request("/api/billing/subscription/cancel", { providerPlanId: "attacker" }), svc)).status).toBe(400); expect(deactivated).toBe("");
    const response = await handleBillingCancelRequest(request("/api/billing/subscription/cancel", {}), svc);
    const payload = await response.json() as { subscription: { status: string; cancellationPending: boolean } };
    expect(response.status).toBe(200); expect(deactivated).toBe("rp-secret"); expect(payload.subscription).toMatchObject({ status: "active", cancellationPending: true });
  });

  it("authenticates webhook before parsing and validates amount/currency against local plan", async () => {
    let applied = 0;
    const repo = { ...baseRepo(), getEventOwner: async () => ({ userId: "user-1", planId: "fixture-pro", pendingPlanId: null }), applyWebhookTransition: async () => { applied++; return { duplicate: false, applied: true, matched: true }; } };
    const svc = services({ repository: repo });
    expect((await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", webhook), svc)).status).toBe(401); expect(applied).toBe(0);
    expect((await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", { ...webhook, data: { ...webhook.data, currency: "USD" } }, { "x-callback-token": svc.webhookToken! }), svc)).status).toBe(400); expect(applied).toBe(0);
    const accepted = await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", webhook, { "x-callback-token": svc.webhookToken! }), svc); expect(accepted.status).toBe(200); expect(applied).toBe(1);
  });
});