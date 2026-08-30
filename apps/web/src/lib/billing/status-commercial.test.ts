import { describe, expect, it } from "vitest";
import type { BillingPlanDefinition } from "./contracts";
import { handleBillingStatusRequest, type BillingHttpRepository, type BillingHttpServices } from "./http";
import type { BillingTrialRecord } from "./repository";

const now = new Date("2026-08-14T10:00:00.000Z");
const nowMs = now.valueOf();
const trial: BillingTrialRecord = {
  userId: "user-1",
  trialTier: "besties",
  startedAt: nowMs - 1_000,
  endsAt: nowMs + 60_000,
  convertedAt: null,
};

const bestiesPlan: BillingPlanDefinition = {
  id: "pro-monthly-2026a",
  displayName: { id: "Besties", en: "Besties" },
  description: { id: "Besties", en: "Besties" },
  amount: 24900,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount: 1,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements: ["advanced_scenarios", "history_depth"],
};

const repository = (overrides: Record<string, unknown> = {}) => ({
  getStatusForUser: async () => ({ subscription: null, checkoutPending: false }),
  getTrialForUser: async () => trial,
  hasHistoricalPaidSubscription: async () => false,
  createCheckoutCorrelation: async () => undefined,
  attachProviderSession: async () => true,
  expireCheckout: async () => true,
  getSubscriptionForCancellation: async () => null,
  markCancellationRequested: async () => true,
  stagePlanChange: async () => true,
  clearPlanChange: async () => true,
  getEventOwner: async () => null,
  applyWebhookTransition: async () => ({ duplicate: false, applied: true, matched: true }),
  ...overrides,
}) as unknown as BillingHttpRepository;

const services = (repo = repository()): BillingHttpServices => ({
  auth: { api: { getSession: async () => ({ user: { id: "user-1", name: "Dina", email: "dina@example.test", emailVerified: true } }) } } as BillingHttpServices["auth"],
  repository: repo,
  plans: { ok: true, plans: [bestiesPlan] },
  xendit: {
    createSubscriptionSession: async () => { throw new Error("status must not call provider"); },
    updateSubscriptionPlan: async () => { throw new Error("status must not call provider"); },
    deactivateSubscription: async () => { throw new Error("status must not call provider"); },
  },
  now: () => now,
});

describe("Phase 07A billing status", () => {
  it("adds active trial commercial state without removing Phase 07 status fields", async () => {
    const response = await handleBillingStatusRequest(
      new Request("https://found.example/api/billing/status"),
      services(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      billing: {
        available: true,
        subscription: null,
        checkoutPending: false,
        entitlements: [],
        commercial: {
          tier: "besties",
          source: "trial",
          accessUntil: trial.endsAt,
          limits: { savedCalculations: null, activeGoals: null, activeProjects: null },
        },
        trial: {
          startedAt: trial.startedAt,
          endsAt: trial.endsAt,
          convertedAt: null,
          eligible: false,
        },
      },
    });
  });

  it("reports one-time trial eligibility only before any trial or paid history", async () => {
    const response = await handleBillingStatusRequest(
      new Request("https://found.example/api/billing/status"),
      services(repository({
        getTrialForUser: async () => null,
        hasHistoricalPaidSubscription: async () => false,
      })),
    );
    expect(await response.json()).toMatchObject({
      billing: {
        commercial: { tier: "friends", source: "friends" },
        trial: { startedAt: null, endsAt: null, convertedAt: null, eligible: true },
      },
    });
  });
});
