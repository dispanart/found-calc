import type { EffectiveCommercialAccess } from "@/lib/billing/contracts";

import type { WidgetAnalyticsLevel, WidgetDomainStatus } from "./contracts";

export interface WidgetRuntimeCapabilities {
  readonly tier: "friends" | "besties" | "family";
  readonly runtimeAvailable: true;
  readonly maxEffectiveDomains: number;
  readonly canCustomizeTheme: boolean;
  readonly canRemoveBranding: boolean;
  readonly whiteLabelAvailable: boolean;
  readonly analyticsLevel: WidgetAnalyticsLevel;
  readonly bulkManagementAvailable: false;
  readonly publicEventApiAvailable: false;
  readonly portfolioRuntimeAvailable: false;
}

export interface WidgetDomainCandidate {
  readonly domainId: string;
  readonly status: WidgetDomainStatus;
  readonly verifiedAt: number | null;
  readonly priority: number | null;
}

export const widgetCapabilitiesForAccess = (
  access: EffectiveCommercialAccess,
): WidgetRuntimeCapabilities => ({
  tier: access.tier,
  runtimeAvailable: true,
  maxEffectiveDomains: access.limits.widgetDomains,
  canCustomizeTheme: access.limits.widgetCustomization,
  canRemoveBranding: access.limits.removeWidgetBranding,
  whiteLabelAvailable: access.limits.whiteLabelWidgets,
  analyticsLevel: access.limits.advancedWidgetAnalytics
    ? "advanced"
    : access.limits.standardWidgetAnalytics
      ? "standard"
      : "operational",
  bulkManagementAvailable: false,
  publicEventApiAvailable: false,
  portfolioRuntimeAvailable: false,
});

const comparePriority = (left: WidgetDomainCandidate, right: WidgetDomainCandidate): number => {
  if (left.priority === null && right.priority === null) return 0;
  if (left.priority === null) return 1;
  if (right.priority === null) return -1;
  return left.priority - right.priority;
};

export const selectEffectiveWidgetDomains = (
  candidates: readonly WidgetDomainCandidate[],
  limit: number,
): readonly string[] => {
  if (!Number.isSafeInteger(limit) || limit <= 0) return [];
  return candidates
    .filter((candidate) => candidate.status === "active" && candidate.verifiedAt !== null)
    .sort((left, right) => {
      const priorityDifference = comparePriority(left, right);
      if (priorityDifference !== 0) return priorityDifference;
      const verificationDifference = (left.verifiedAt ?? 0) - (right.verifiedAt ?? 0);
      if (verificationDifference !== 0) return verificationDifference;
      return left.domainId.localeCompare(right.domainId);
    })
    .slice(0, limit)
    .map((candidate) => candidate.domainId);
};
