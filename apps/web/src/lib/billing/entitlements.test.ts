import { describe, expect, it } from "vitest";
import { resolveBillingEntitlements } from "./entitlements";

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

describe("billing entitlements", () => {
  it("grants exactly configured keys only for active local subscriptions", () => {
    expect(resolveBillingEntitlements(plan, "active")).toEqual({
      planId: "fixture-pro",
      subscriptionStatus: "active",
      keys: ["fixture.export", "fixture.team"],
    });
    for (const status of [null, "pending", "past_due", "inactive"] as const) {
      expect(resolveBillingEntitlements(plan, status).keys).toEqual([]);
    }
  });

  it("fails closed when the configured plan is missing", () => {
    expect(resolveBillingEntitlements(null, "active")).toEqual({
      planId: null,
      subscriptionStatus: "active",
      keys: [],
    });
  });
});
