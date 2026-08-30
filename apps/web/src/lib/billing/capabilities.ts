import type { D1Database } from "@cloudflare/workers-types";

import type { CommercialLimits } from "./contracts";
import { resolveEffectiveCommercialAccess } from "./entitlements";
import { offerInternalTier } from "./plans";
import { createBillingRepository } from "./repository";

export type CommercialPersistenceLimits = Pick<
  CommercialLimits,
  "savedCalculations" | "activeGoals" | "activeProjects"
>;

export interface CommercialCapabilityAuthorizer {
  getLimits(userId: string, now?: Date): Promise<CommercialPersistenceLimits>;
}

const persistenceLimits = (limits: CommercialLimits): CommercialPersistenceLimits => ({
  savedCalculations: limits.savedCalculations,
  activeGoals: limits.activeGoals,
  activeProjects: limits.activeProjects,
});

export const createCommercialCapabilityAuthorizer = (
  database: D1Database,
  clock: () => Date = () => new Date(),
): CommercialCapabilityAuthorizer => {
  const repository = createBillingRepository(database);
  return {
    getLimits: async (userId: string, now = clock()) => {
      const nowMs = now.valueOf();
      if (!Number.isSafeInteger(nowMs)) throw new RangeError("now must be a valid millisecond timestamp");
      const [status, trial] = await Promise.all([
        repository.getStatusForUser(userId),
        repository.getTrialForUser(userId),
      ]);
      const subscription = status.subscription;
      const access = resolveEffectiveCommercialAccess({
        paidTier: subscription ? offerInternalTier(subscription.planId) : null,
        subscriptionStatus: subscription?.status ?? null,
        paidThroughAt: subscription?.paidThroughAt ?? null,
        trial,
        now: nowMs,
        checkoutPending: status.checkoutPending,
      });
      return persistenceLimits(access.limits);
    },
  };
};