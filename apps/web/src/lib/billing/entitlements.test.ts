import { describe, expect, it } from "vitest";
import { resolveBillingEntitlements, resolveEffectiveCommercialAccess } from "./entitlements";

const plan = {
  id: "fixture-pro",
  displayName: { id: "Fixture Pro", en: "Fixture Pro" },
  description: { id: "Hanya pengujian", en: "Testing only" },
  amount: 10000,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount: 1,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements: ["fixture.export", "fixture.team"],
} as const;

const now = 1_800_000_000_000;
const activeTrial = { startedAt: now - 1000, endsAt: now + 1000, convertedAt: null };
const base = {
  subscriptionStatus: null,
  paidTier: null,
  paidThroughAt: null,
  paidKeys: [] as const,
  trial: null,
  trialKeys: ["advanced_scenarios", "history_depth"] as const,
  now,
  checkoutPending: false,
} as const;

describe("billing entitlements", () => {
  it("keeps the Phase 07 key snapshot compatibility contract", () => {
    expect(resolveBillingEntitlements(plan, "active")).toEqual({
      planId: "fixture-pro",
      subscriptionStatus: "active",
      keys: ["fixture.export", "fixture.team"],
    });
    for (const status of [null, "pending", "past_due", "inactive"] as const) {
      expect(resolveBillingEntitlements(plan, status).keys).toEqual([]);
    }
  });

  it("fails closed in the legacy snapshot when the configured plan is missing", () => {
    expect(resolveBillingEntitlements(null, "active")).toEqual({
      planId: null,
      subscriptionStatus: "active",
      keys: [],
    });
  });

  it("prefers active Family paid access over an active Besties trial", () => {
    expect(resolveEffectiveCommercialAccess({
      ...base,
      paidTier: "business",
      subscriptionStatus: "active",
      paidKeys: ["bulk_sku"],
      trial: activeTrial,
    })).toMatchObject({ tier: "family", source: "paid", keys: ["bulk_sku"] });
  });

  it("prefers active Besties paid access over an active trial", () => {
    expect(resolveEffectiveCommercialAccess({
      ...base,
      paidTier: "pro",
      subscriptionStatus: "active",
      paidKeys: ["advanced_scenarios"],
      trial: activeTrial,
    })).toMatchObject({ tier: "besties", source: "paid", keys: ["advanced_scenarios"] });
  });

  it("keeps cancelled provider-inactive Besties paid access until paid-through", () => {
    expect(resolveEffectiveCommercialAccess({
      ...base,
      paidTier: "pro",
      subscriptionStatus: "inactive",
      paidThroughAt: now + 60_000,
      paidKeys: ["advanced_scenarios"],
      trial: activeTrial,
    })).toMatchObject({ tier: "besties", source: "paid", accessUntil: now + 60_000 });
  });

  it("falls back after the paid-through boundary even when the provider record remains", () => {
    expect(resolveEffectiveCommercialAccess({
      ...base,
      paidTier: "pro",
      subscriptionStatus: "inactive",
      paidThroughAt: now,
    })).toMatchObject({ tier: "friends", source: "friends", accessUntil: null });
  });

  it("resolves active and expired trial windows from server timestamps", () => {
    expect(resolveEffectiveCommercialAccess({ ...base, trial: activeTrial })).toMatchObject({
      tier: "besties", source: "trial", accessUntil: activeTrial.endsAt,
    });
    expect(resolveEffectiveCommercialAccess({
      ...base,
      trial: { startedAt: now - 10_000, endsAt: now, convertedAt: null },
    })).toMatchObject({ tier: "friends", source: "friends" });
  });

  it("does not allow pending checkout to extend trial or create paid access", () => {
    expect(resolveEffectiveCommercialAccess({
      ...base,
      checkoutPending: true,
      trial: { startedAt: now - 10_000, endsAt: now, convertedAt: null },
    })).toMatchObject({ tier: "friends", source: "friends" });
  });

  it("returns the exact Friends creation and widget limits", () => {
    expect(resolveEffectiveCommercialAccess(base).limits).toMatchObject({
      savedCalculations: 5,
      activeGoals: 1,
      activeProjects: 1,
      widgetDomains: 1,
      removeWidgetBranding: false,
    });
  });
});
