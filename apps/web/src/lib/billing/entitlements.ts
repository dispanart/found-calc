import type { BillingEntitlementSnapshot, BillingPlanDefinition, BillingSubscriptionStatus } from "./contracts";

export const resolveBillingEntitlements = (
  plan: BillingPlanDefinition | null,
  status: BillingSubscriptionStatus | null,
): BillingEntitlementSnapshot => ({
  planId: plan?.id ?? null,
  subscriptionStatus: status,
  keys: plan && status === "active" ? [...new Set(plan.entitlements)] : [],
});
