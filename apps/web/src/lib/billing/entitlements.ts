import type {
  BillingEntitlementSnapshot,
  BillingPlanDefinition,
  BillingSubscriptionStatus,
  EffectiveCommercialAccess,
  ResolveCommercialAccessInput,
} from "./contracts";
import { commercialLimitsFor, internalPaidTierToCommercialTier } from "./commercial";

const uniqueKeys = (keys: readonly string[] | undefined): readonly string[] => [...new Set(keys ?? [])];

export const resolveEffectiveCommercialAccess = (
  input: ResolveCommercialAccessInput,
): EffectiveCommercialAccess => {
  if (!Number.isSafeInteger(input.now)) throw new RangeError("now must be an integer timestamp in milliseconds");

  const paidEffective = input.paidTier !== null && (
    input.subscriptionStatus === "active"
    || input.subscriptionStatus === "inactive"
      && input.paidThroughAt !== null
      && input.paidThroughAt > input.now
  );
  if (paidEffective && input.paidTier) {
    const tier = internalPaidTierToCommercialTier(input.paidTier);
    return {
      tier,
      source: "paid",
      keys: uniqueKeys(input.paidKeys),
      limits: commercialLimitsFor(tier),
      accessUntil: input.paidThroughAt,
    };
  }

  const trialActive = input.trial !== null
    && input.trial.convertedAt === null
    && input.trial.startedAt <= input.now
    && input.now < input.trial.endsAt;
  if (trialActive && input.trial) {
    return {
      tier: "besties",
      source: "trial",
      keys: uniqueKeys(input.trialKeys),
      limits: commercialLimitsFor("besties"),
      accessUntil: input.trial.endsAt,
    };
  }

  return {
    tier: "friends",
    source: "friends",
    keys: [],
    limits: commercialLimitsFor("friends"),
    accessUntil: null,
  };
};

// Phase 07 compatibility snapshot. Phase 07A application access should use
// resolveEffectiveCommercialAccess so provider status is not confused with entitlement state.
export const resolveBillingEntitlements = (
  plan: BillingPlanDefinition | null,
  status: BillingSubscriptionStatus | null,
): BillingEntitlementSnapshot => ({
  planId: plan?.id ?? null,
  subscriptionStatus: status,
  keys: plan && status === "active" ? uniqueKeys(plan.entitlements) : [],
});
