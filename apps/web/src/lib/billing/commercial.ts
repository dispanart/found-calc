import type { CommercialLimits, CommercialTier, InternalPaidTier } from "./contracts";

const PUBLIC_PLAN_NAMES = {
  friends: "Friends",
  besties: "Besties",
  family: "Family",
} as const satisfies Record<CommercialTier, string>;

const LIMITS = {
  friends: {
    savedCalculations: 5,
    historyDays: 30,
    activeGoals: 1,
    activeProjects: 1,
    widgetDomains: 1,
    teamSeats: 1,
    removeWidgetBranding: false,
    widgetCustomization: false,
    standardWidgetAnalytics: false,
    whiteLabelWidgets: false,
    advancedWidgetAnalytics: false,
    portfolioEnabled: false,
    bulkSku: false,
    csvImport: false,
    multiMarketplace: false,
    multiStoreBusiness: false,
    campaignPortfolio: false,
  },
  besties: {
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
  },
  family: {
    savedCalculations: null,
    historyDays: null,
    activeGoals: null,
    activeProjects: null,
    widgetDomains: 10,
    teamSeats: 2,
    removeWidgetBranding: true,
    widgetCustomization: true,
    standardWidgetAnalytics: true,
    whiteLabelWidgets: true,
    advancedWidgetAnalytics: true,
    portfolioEnabled: true,
    bulkSku: true,
    csvImport: true,
    multiMarketplace: true,
    multiStoreBusiness: true,
    campaignPortfolio: true,
  },
} as const satisfies Record<CommercialTier, CommercialLimits>;

export const publicPlanName = (tier: CommercialTier): (typeof PUBLIC_PLAN_NAMES)[CommercialTier] =>
  PUBLIC_PLAN_NAMES[tier];

export const internalPaidTierToCommercialTier = (
  tier: InternalPaidTier,
): Exclude<CommercialTier, "friends"> => (tier === "pro" ? "besties" : "family");

export const commercialLimitsFor = (tier: CommercialTier): CommercialLimits => LIMITS[tier];
