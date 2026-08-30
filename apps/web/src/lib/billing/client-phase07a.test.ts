import { describe, expect, it } from "vitest";

import { parseBillingStatusPayload } from "./client";

const limits = {
  savedCalculations: null,
  historyDays: null,
  activeGoals: null,
  activeProjects: null,
  widgetDomains: 3,
  teamSeats: 1,
  removeWidgetBranding: true,
  widgetCustomization: true,
  standardWidgetAnalytics: true,
  whiteLabelWidgets: false,
  advancedWidgetAnalytics: false,
  portfolioEnabled: false,
  bulkSku: false,
  csvImport: false,
  multiMarketplace: false,
  multiStoreBusiness: false,
  campaignPortfolio: false,
};

describe("Phase 07A billing client payload", () => {
  it("parses commercial access, trial state, and paid-through without breaking Phase 07 fields", () => {
    const parsed = parseBillingStatusPayload({
      billing: {
        available: true,
        plans: [{
          id: "pro-monthly-2026a",
          displayName: { id: "Besties", en: "Besties" },
          description: { id: "Plan", en: "Plan" },
          amount: 24900,
          currency: "IDR",
          interval: "MONTH",
          intervalCount: 1,
        }],
        subscription: {
          planId: "pro-monthly-2026a",
          status: "inactive",
          latestCycleStatus: "SUCCEEDED",
          nextCycleAt: 1_800_000_000_000,
          paidThroughAt: 1_800_000_000_000,
          cancellationPending: true,
          pendingPlanId: null,
        },
        checkoutPending: false,
        entitlements: [],
        commercial: {
          tier: "besties",
          source: "paid",
          keys: [],
          limits,
          accessUntil: 1_800_000_000_000,
        },
        trial: {
          startedAt: 1_700_000_000_000,
          endsAt: 1_701_209_600_000,
          convertedAt: null,
          eligible: false,
        },
      },
    });

    expect(parsed?.subscription?.paidThroughAt).toBe(1_800_000_000_000);
    expect(parsed?.commercial?.tier).toBe("besties");
    expect(parsed?.commercial?.source).toBe("paid");
    expect(parsed?.trial?.eligible).toBe(false);
    expect(parsed?.trial?.endsAt).toBe(1_701_209_600_000);
  });
});