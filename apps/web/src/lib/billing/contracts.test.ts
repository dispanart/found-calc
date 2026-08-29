import { describe, expect, it } from "vitest";
import { isBillingSubscriptionStatus } from "./contracts";

describe("billing contracts", () => {
  it("accepts only the first-party subscription vocabulary", () => {
    expect(["pending", "active", "past_due", "inactive"].every(isBillingSubscriptionStatus)).toBe(true);
    expect(isBillingSubscriptionStatus("retrying")).toBe(false);
  });
});
