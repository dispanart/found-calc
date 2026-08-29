import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFoundCalcAuth } from "../../src/lib/auth/server";
import {
  handleBillingCancelRequest,
  handleBillingChangeRequest,
  handleBillingCheckoutRequest,
  handleBillingStatusRequest,
  handleBillingWebhookRequest,
  type BillingHttpServices,
} from "../../src/lib/billing/http";
import { createBillingRepository } from "../../src/lib/billing/repository";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const secret = "phase-07-billing-api-test-secret-that-is-long-enough";
const baseURL = "http://localhost:3000";
const webhookToken = "phase-07-webhook-token-with-enough-entropy";
const plans = { ok: true as const, plans: [{
  id: "fixture-pro",
  displayName: { id: "Fixture Pro", en: "Fixture Pro" },
  description: { id: "Hanya pengujian", en: "Testing only" },
  amount: 10000, currency: "IDR" as const, country: "ID" as const, interval: "MONTH" as const, intervalCount: 1,
  billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME" as const, entitlements: ["fixture.export"],
}, {
  id: "fixture-business",
  displayName: { id: "Fixture Business", en: "Fixture Business" },
  description: { id: "Hanya pengujian switch", en: "Switch testing only" },
  amount: 20000, currency: "IDR" as const, country: "ID" as const, interval: "MONTH" as const, intervalCount: 12,
  billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME" as const, entitlements: ["fixture.export", "fixture.team"],
}] };

const signUp = async (auth: ReturnType<typeof createFoundCalcAuth>, email: string) => {
  const response = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Billing User", email, password: "phase-seven-password-123" }),
  }));
  expect(response.status).toBe(200);
  const payload = await response.clone().json() as { user: { id: string } };
  return { id: payload.user.id, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0]! };
};

const request = (path: string, method: string, cookie?: string, body?: unknown, headers?: HeadersInit) => new Request(`${baseURL}${path}`, {
  method,
  headers: {
    ...(cookie ? { cookie } : {}),
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...Object.fromEntries(new Headers(headers).entries()),
  },
  ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
});

const activatedWebhook = (referenceId: string, amount = 10000) => ({
  event: "recurring.plan.activated",
  created: "2026-08-14T10:01:00.000Z",
  data: {
    id: "rp-1",
    reference_id: referenceId,
    status: "ACTIVE",
    amount,
    currency: "IDR",
    created: "2026-08-14T10:00:30.000Z",
    updated: "2026-08-14T10:01:00.000Z",
  },
});

const cycleWebhook = (event: "recurring.cycle.retrying" | "recurring.cycle.succeeded", referenceId: string, amount: number, updated: string) => ({
  event,
  created: updated,
  data: {
    id: `cycle-${event.split(".").at(-1)}`,
    plan_id: "rp-1",
    reference_id: referenceId,
    status: event.endsWith("retrying") ? "RETRYING" : "SUCCEEDED",
    amount, currency: "IDR", created: updated, updated, scheduled_timestamp: updated,
  },
});

beforeEach(resetCurrentDatabase);

describe("Phase 07 billing API with D1", () => {
  it("authenticates browser APIs and keeps configured plans fail-closed", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const repository = createBillingRepository(env.DB);
    const xendit = { createSubscriptionSession: vi.fn(), updateSubscriptionPlan: vi.fn(), deactivateSubscription: vi.fn() } as unknown as BillingHttpServices["xendit"];
    const services = { auth, repository, plans, xendit, publicAppOrigin: "https://found.example" };
    expect((await handleBillingStatusRequest(request("/api/billing/status", "GET"), services)).status).toBe(401);
    const user = await signUp(auth, "billing-status@example.com");
    const response = await handleBillingStatusRequest(request("/api/billing/status", "GET", user.cookie), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ billing: { available: true, checkoutPending: false, subscription: null, entitlements: [] } });
    expect(xendit.createSubscriptionSession).not.toHaveBeenCalled();
  });

  it("correlates hosted checkout before provider return and activates only after authenticated webhook", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "billing-checkout@example.com");
    const repository = createBillingRepository(env.DB);
    let capturedReference = "";
    const xendit: BillingHttpServices["xendit"] = {
      createSubscriptionSession: vi.fn(async (input) => {
        capturedReference = input.referenceId;
        return { paymentSessionId: "ps-1", recurringPlanId: "rp-1", referenceId: input.referenceId, paymentLinkUrl: "https://payments.xendit.co/session/ps-1" };
      }),
      updateSubscriptionPlan: async () => undefined, deactivateSubscription: vi.fn(async () => undefined),
    };
    const services: BillingHttpServices = {
      auth, repository, plans, xendit, publicAppOrigin: "https://found.example", webhookToken,
      randomUUID: () => "00000000-0000-4000-8000-000000000001", now: () => new Date("2026-08-14T10:00:00.000Z"),
    };
    const checkout = await handleBillingCheckoutRequest(request("/api/billing/checkout", "POST", user.cookie, { planId: "fixture-pro" }), services);
    expect(checkout.status).toBe(201);
    expect(capturedReference).toMatch(/^fcbilling/);
    expect((await repository.getStatusForUser(user.id))).toMatchObject({ checkoutPending: true, subscription: null });

    const forgedReturnStatus = await handleBillingStatusRequest(request("/api/billing/status?checkout=success", "GET", user.cookie), services);
    expect((await forgedReturnStatus.json()).billing.entitlements).toEqual([]);

    const webhook = await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, activatedWebhook(capturedReference), { "x-callback-token": webhookToken }), services);
    expect(webhook.status).toBe(200);
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ status: "active", planId: "fixture-pro", providerPlanId: "rp-1" });
    const status = await handleBillingStatusRequest(request("/api/billing/status", "GET", user.cookie), services);
    expect((await status.json()).billing.entitlements).toEqual(["fixture.export"]);
  });

  it("rejects malformed, oversized, unauthenticated, and commercial-mismatch webhook input without mutation", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "billing-webhook@example.com");
    const repository = createBillingRepository(env.DB);
    await repository.createCheckoutCorrelation({ id: "checkout-1", userId: user.id, planId: "fixture-pro", referenceId: "ref-1" });
    const services: BillingHttpServices = {
      auth, repository, plans,
      xendit: { createSubscriptionSession: vi.fn(), updateSubscriptionPlan: vi.fn(), deactivateSubscription: vi.fn() } as unknown as BillingHttpServices["xendit"],
      publicAppOrigin: "https://found.example", webhookToken,
    };
    expect((await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, activatedWebhook("ref-1")), services)).status).toBe(401);
    expect((await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, "{bad", { "x-callback-token": webhookToken }), services)).status).toBe(400);
    const tooLarge = new Request(`${baseURL}/api/billing/webhooks/xendit`, { method: "POST", headers: { "x-callback-token": webhookToken, "content-length": "70000" }, body: "{}" });
    expect((await handleBillingWebhookRequest(tooLarge, services)).status).toBe(413);
    expect((await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, activatedWebhook("ref-1", 9999), { "x-callback-token": webhookToken }), services)).status).toBe(400);
    expect((await repository.getStatusForUser(user.id)).subscription).toBeNull();
  });

  it("keeps upgrade and downgrade pending until a matching successful-cycle webhook", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "billing-switch@example.com");
    const repository = createBillingRepository(env.DB);
    await repository.createCheckoutCorrelation({ id: "checkout-switch", userId: user.id, planId: "fixture-pro", referenceId: "ref-switch" });
    await repository.applyWebhookTransition({
      dedupeKey: "activate-switch", eventName: "recurring.plan.activated", providerPlanId: "rp-1", providerCycleId: null,
      referenceId: "ref-switch", providerEventAt: Date.parse("2026-08-14T10:01:00.000Z"), nextStatus: "active", latestCycleStatus: null,
      currentCycleStartedAt: null, nextCycleAt: null, providerCreatedAt: null, providerUpdatedAt: Date.parse("2026-08-14T10:01:00.000Z"), rank: 20,
    });
    const updateSubscriptionPlan = vi.fn(async () => undefined);
    const services: BillingHttpServices = {
      auth, repository, plans, webhookToken, publicAppOrigin: "https://found.example",
      xendit: { createSubscriptionSession: vi.fn(), updateSubscriptionPlan, deactivateSubscription: vi.fn() },
      now: () => new Date("2026-08-14T10:02:00.000Z"),
    };

    const upgrade = await handleBillingChangeRequest(request("/api/billing/subscription/change", "POST", user.cookie, { planId: "fixture-business" }), services);
    expect(upgrade.status).toBe(202);
    expect(updateSubscriptionPlan).toHaveBeenLastCalledWith("rp-1", expect.objectContaining({ amount: 20000, intervalCount: 12 }));
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ planId: "fixture-pro", pendingPlanId: "fixture-business", status: "active" });

    const retry = await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, cycleWebhook("recurring.cycle.retrying", "ref-switch", 20000, "2026-08-14T10:03:00.000Z"), { "x-callback-token": webhookToken }), services);
    expect(retry.status).toBe(200);
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ planId: "fixture-pro", pendingPlanId: "fixture-business", status: "past_due" });

    const success = await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, cycleWebhook("recurring.cycle.succeeded", "ref-switch", 20000, "2026-08-14T10:04:00.000Z"), { "x-callback-token": webhookToken }), services);
    expect(success.status).toBe(200);
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ planId: "fixture-business", pendingPlanId: null, status: "active" });

    const downgrade = await handleBillingChangeRequest(request("/api/billing/subscription/change", "POST", user.cookie, { planId: "fixture-pro" }), services);
    expect(downgrade.status).toBe(202);
    expect(updateSubscriptionPlan).toHaveBeenLastCalledWith("rp-1", expect.objectContaining({ amount: 10000, intervalCount: 1 }));
    const downgradeSuccess = await handleBillingWebhookRequest(request("/api/billing/webhooks/xendit", "POST", undefined, cycleWebhook("recurring.cycle.succeeded", "ref-switch", 10000, "2026-08-14T10:05:00.000Z"), { "x-callback-token": webhookToken }), services);
    expect(downgradeSuccess.status).toBe(200);
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ planId: "fixture-pro", pendingPlanId: null, status: "active" });
  });

  it("deactivates provider subscription but retains local access until provider inactivation webhook", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const user = await signUp(auth, "billing-cancel@example.com");
    const repository = createBillingRepository(env.DB);
    await repository.createCheckoutCorrelation({ id: "checkout-1", userId: user.id, planId: "fixture-pro", referenceId: "ref-cancel" });
    await repository.applyWebhookTransition({
      dedupeKey: "activate", eventName: "recurring.plan.activated", providerPlanId: "rp-cancel", providerCycleId: null,
      referenceId: "ref-cancel", providerEventAt: 1_800_000_000_000, nextStatus: "active", latestCycleStatus: null,
      currentCycleStartedAt: null, nextCycleAt: null, providerCreatedAt: null, providerUpdatedAt: 1_800_000_000_000, rank: 20,
    });
    const deactivateSubscription = vi.fn(async () => undefined);
    const services: BillingHttpServices = {
      auth, repository, plans,
      xendit: { createSubscriptionSession: vi.fn(), updateSubscriptionPlan: vi.fn(async () => undefined), deactivateSubscription } as unknown as BillingHttpServices["xendit"],
      publicAppOrigin: "https://found.example", webhookToken,
      now: () => new Date("2026-08-14T10:00:00.000Z"),
    };
    const response = await handleBillingCancelRequest(request("/api/billing/subscription/cancel", "POST", user.cookie, {}), services);
    expect(response.status).toBe(200);
    expect(deactivateSubscription).toHaveBeenCalledWith("rp-cancel");
    expect((await repository.getStatusForUser(user.id)).subscription).toMatchObject({ status: "active", cancellationRequestedAt: expect.any(Number) });
  });
});
