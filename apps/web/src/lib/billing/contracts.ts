export type BillingLocale = "id" | "en";
export type BillingSubscriptionStatus = "pending" | "active" | "past_due" | "inactive";
export type BillingFailedCycleAction = "RESUME" | "STOP";

export type CommercialTier = "friends" | "besties" | "family";
export type InternalPaidTier = "pro" | "business";

export type CommercialLimits = {
  readonly savedCalculations: number | null;
  readonly historyDays: number | null;
  readonly activeGoals: number | null;
  readonly activeProjects: number | null;
  readonly widgetDomains: number;
  readonly teamSeats: number;
  readonly removeWidgetBranding: boolean;
  readonly widgetCustomization: boolean;
  readonly standardWidgetAnalytics: boolean;
  readonly whiteLabelWidgets: boolean;
  readonly advancedWidgetAnalytics: boolean;
  readonly portfolioEnabled: boolean;
  readonly bulkSku: boolean;
  readonly csvImport: boolean;
  readonly multiMarketplace: boolean;
  readonly multiStoreBusiness: boolean;
  readonly campaignPortfolio: boolean;
};

export type BillingPlanDefinition = {
  readonly id: string;
  readonly displayName: { readonly id: string; readonly en: string };
  readonly description: { readonly id: string; readonly en: string };
  readonly amount: number;
  readonly currency: "IDR";
  readonly country: "ID";
  readonly interval: "MONTH";
  readonly intervalCount: number;
  readonly billingDay: number;
  readonly totalRecurrence: number | null;
  readonly failedCycleAction: BillingFailedCycleAction;
  readonly entitlements: readonly string[];
};

export type BillingEntitlementSnapshot = {
  readonly planId: string | null;
  readonly subscriptionStatus: BillingSubscriptionStatus | null;
  readonly keys: readonly string[];
};

export const isBillingSubscriptionStatus = (value: unknown): value is BillingSubscriptionStatus =>
  value === "pending" || value === "active" || value === "past_due" || value === "inactive";

export const isBillingLocale = (value: unknown): value is BillingLocale => value === "id" || value === "en";
