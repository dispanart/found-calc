export type BillingPlanClient = {
  readonly id: string;
  readonly displayName: { readonly id: string; readonly en: string };
  readonly description: { readonly id: string; readonly en: string };
  readonly amount: number;
  readonly currency: "IDR";
  readonly interval: "MONTH";
  readonly intervalCount: number;
};

export type BillingSubscriptionClient = {
  readonly planId: string;
  readonly status: "pending" | "active" | "past_due" | "inactive";
  readonly latestCycleStatus: string | null;
  readonly nextCycleAt: number | null;
  readonly paidThroughAt?: number | null;
  readonly cancellationPending: boolean;
  readonly pendingPlanId: string | null;
};

export type CommercialLimitsClient = {
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

export type CommercialAccessClient = {
  readonly tier: "friends" | "besties" | "family";
  readonly source: "friends" | "trial" | "paid";
  readonly keys: readonly string[];
  readonly limits: CommercialLimitsClient;
  readonly accessUntil: number | null;
};

export type BillingTrialClient = {
  readonly startedAt: number | null;
  readonly endsAt: number | null;
  readonly convertedAt: number | null;
  readonly eligible: boolean;
};

export type BillingStatusClient = {
  readonly available: boolean;
  readonly plans: readonly BillingPlanClient[];
  readonly subscription: BillingSubscriptionClient | null;
  readonly checkoutPending: boolean;
  readonly entitlements: readonly string[];
  readonly commercial?: CommercialAccessClient;
  readonly trial?: BillingTrialClient;
};

export class BillingClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "BillingClientError";
    this.code = code;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
};
const nonEmpty = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const nullableTimestamp = (value: unknown): value is number | null => value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
const nullableLimit = (value: unknown): value is number | null => value === null || (Number.isSafeInteger(value) && Number(value) >= 0);
const nonNegativeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

const parseLocalized = (value: unknown, max: number): { id: string; en: string } | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "en"]) || !nonEmpty(value.id, max) || !nonEmpty(value.en, max)) return null;
  return { id: value.id.trim(), en: value.en.trim() };
};

const parsePlan = (value: unknown): BillingPlanClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "displayName", "description", "amount", "currency", "interval", "intervalCount"])) return null;
  const displayName = parseLocalized(value.displayName, 80);
  const description = parseLocalized(value.description, 320);
  if (!nonEmpty(value.id, 64) || !displayName || !description) return null;
  if (!Number.isSafeInteger(value.amount) || Number(value.amount) <= 0 || value.currency !== "IDR" || value.interval !== "MONTH") return null;
  if (!Number.isSafeInteger(value.intervalCount) || Number(value.intervalCount) < 1 || Number(value.intervalCount) > 24) return null;
  return { id: value.id.trim(), displayName, description, amount: Number(value.amount), currency: "IDR", interval: "MONTH", intervalCount: Number(value.intervalCount) };
};

const parseSubscription = (value: unknown): BillingSubscriptionClient | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, ["planId", "status", "latestCycleStatus", "nextCycleAt", "paidThroughAt", "cancellationPending", "pendingPlanId"])) return undefined;
  if (!nonEmpty(value.planId, 64)) return undefined;
  if (value.status !== "pending" && value.status !== "active" && value.status !== "past_due" && value.status !== "inactive") return undefined;
  if (value.latestCycleStatus !== null && !nonEmpty(value.latestCycleStatus, 64)) return undefined;
  if (!nullableTimestamp(value.nextCycleAt) || typeof value.cancellationPending !== "boolean") return undefined;
  if (value.pendingPlanId !== null && !nonEmpty(value.pendingPlanId, 64)) return undefined;
  if (value.paidThroughAt !== undefined && !nullableTimestamp(value.paidThroughAt)) return undefined;
  return {
    planId: value.planId.trim(),
    status: value.status,
    latestCycleStatus: value.latestCycleStatus === null ? null : value.latestCycleStatus.trim(),
    nextCycleAt: value.nextCycleAt,
    ...(value.paidThroughAt === undefined ? {} : { paidThroughAt: value.paidThroughAt }),
    cancellationPending: value.cancellationPending,
    pendingPlanId: value.pendingPlanId === null ? null : value.pendingPlanId.trim(),
  };
};

const LIMIT_KEYS = [
  "savedCalculations", "historyDays", "activeGoals", "activeProjects", "widgetDomains", "teamSeats",
  "removeWidgetBranding", "widgetCustomization", "standardWidgetAnalytics", "whiteLabelWidgets",
  "advancedWidgetAnalytics", "portfolioEnabled", "bulkSku", "csvImport", "multiMarketplace",
  "multiStoreBusiness", "campaignPortfolio",
] as const;

const parseLimits = (value: unknown): CommercialLimitsClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, LIMIT_KEYS) || Object.keys(value).length !== LIMIT_KEYS.length) return null;
  if (!nullableLimit(value.savedCalculations) || !nullableLimit(value.historyDays) || !nullableLimit(value.activeGoals) || !nullableLimit(value.activeProjects)) return null;
  if (!nonNegativeInteger(value.widgetDomains) || !nonNegativeInteger(value.teamSeats)) return null;
  const booleans = [
    value.removeWidgetBranding, value.widgetCustomization, value.standardWidgetAnalytics,
    value.whiteLabelWidgets, value.advancedWidgetAnalytics, value.portfolioEnabled, value.bulkSku,
    value.csvImport, value.multiMarketplace, value.multiStoreBusiness, value.campaignPortfolio,
  ];
  if (!booleans.every((item) => typeof item === "boolean")) return null;
  return {
    savedCalculations: value.savedCalculations,
    historyDays: value.historyDays,
    activeGoals: value.activeGoals,
    activeProjects: value.activeProjects,
    widgetDomains: value.widgetDomains,
    teamSeats: value.teamSeats,
    removeWidgetBranding: value.removeWidgetBranding as boolean,
    widgetCustomization: value.widgetCustomization as boolean,
    standardWidgetAnalytics: value.standardWidgetAnalytics as boolean,
    whiteLabelWidgets: value.whiteLabelWidgets as boolean,
    advancedWidgetAnalytics: value.advancedWidgetAnalytics as boolean,
    portfolioEnabled: value.portfolioEnabled as boolean,
    bulkSku: value.bulkSku as boolean,
    csvImport: value.csvImport as boolean,
    multiMarketplace: value.multiMarketplace as boolean,
    multiStoreBusiness: value.multiStoreBusiness as boolean,
    campaignPortfolio: value.campaignPortfolio as boolean,
  };
};

const parseCommercial = (value: unknown): CommercialAccessClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["tier", "source", "keys", "limits", "accessUntil"])) return null;
  if (value.tier !== "friends" && value.tier !== "besties" && value.tier !== "family") return null;
  if (value.source !== "friends" && value.source !== "trial" && value.source !== "paid") return null;
  if (!Array.isArray(value.keys) || !nullableTimestamp(value.accessUntil)) return null;
  const keys: string[] = [];
  for (const key of value.keys) {
    if (!nonEmpty(key, 128) || !/^[a-z0-9][a-z0-9._:-]{1,127}$/.test(key)) return null;
    if (!keys.includes(key)) keys.push(key);
  }
  const limits = parseLimits(value.limits);
  if (!limits) return null;
  return { tier: value.tier, source: value.source, keys, limits, accessUntil: value.accessUntil };
};

const parseTrial = (value: unknown): BillingTrialClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["startedAt", "endsAt", "convertedAt", "eligible"])) return null;
  if (!nullableTimestamp(value.startedAt) || !nullableTimestamp(value.endsAt) || !nullableTimestamp(value.convertedAt) || typeof value.eligible !== "boolean") return null;
  return { startedAt: value.startedAt, endsAt: value.endsAt, convertedAt: value.convertedAt, eligible: value.eligible };
};

export const parseBillingStatusPayload = (value: unknown): BillingStatusClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["billing"]) || !isRecord(value.billing)) return null;
  const billing = value.billing;
  if (!hasOnlyKeys(billing, ["available", "plans", "subscription", "checkoutPending", "entitlements", "commercial", "trial"])) return null;
  if (typeof billing.available !== "boolean" || typeof billing.checkoutPending !== "boolean" || !Array.isArray(billing.plans) || !Array.isArray(billing.entitlements)) return null;
  const plans: BillingPlanClient[] = [];
  for (const candidate of billing.plans) { const parsed = parsePlan(candidate); if (!parsed) return null; plans.push(parsed); }
  const subscription = parseSubscription(billing.subscription);
  if (subscription === undefined) return null;
  const entitlements: string[] = [];
  for (const key of billing.entitlements) {
    if (!nonEmpty(key, 128) || !/^[a-z0-9][a-z0-9._:-]{1,127}$/.test(key)) return null;
    if (!entitlements.includes(key)) entitlements.push(key);
  }
  const commercial = billing.commercial === undefined ? undefined : parseCommercial(billing.commercial);
  if (billing.commercial !== undefined && commercial === null) return null;
  const trial = billing.trial === undefined ? undefined : parseTrial(billing.trial);
  if (billing.trial !== undefined && trial === null) return null;
  return {
    available: billing.available,
    plans,
    subscription,
    checkoutPending: billing.checkoutPending,
    entitlements,
    ...(commercial === undefined ? {} : { commercial }),
    ...(trial === undefined ? {} : { trial }),
  };
};

const errorCode = async (response: Response): Promise<string> => {
  try {
    const value = await response.clone().json() as unknown;
    if (isRecord(value) && isRecord(value.error) && typeof value.error.code === "string") return value.error.code;
  } catch { /* normalized below */ }
  return "billing-request-failed";
};
const requireOk = async (response: Response) => { if (!response.ok) throw new BillingClientError(await errorCode(response), response.status); };

export const fetchBillingStatus = async (signal?: AbortSignal): Promise<BillingStatusClient> => {
  const response = await fetch("/api/billing/status", { cache: "no-store", signal: signal ?? null });
  await requireOk(response);
  const parsed = parseBillingStatusPayload(await response.json());
  if (!parsed) throw new BillingClientError("invalid-billing-response", 502);
  return parsed;
};

export const startBestiesTrial = async (): Promise<void> => {
  const response = await fetch("/api/billing/trial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  await requireOk(response);
};

export const startBillingCheckout = async (planId: string, locale: "id" | "en"): Promise<string> => {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, locale }),
  });
  await requireOk(response);
  const value = await response.json() as unknown;
  if (!isRecord(value) || !hasOnlyKeys(value, ["checkout"]) || !isRecord(value.checkout) || !hasOnlyKeys(value.checkout, ["url"]) || typeof value.checkout.url !== "string") {
    throw new BillingClientError("invalid-billing-response", 502);
  }
  try {
    const url = new URL(value.checkout.url);
    if (url.protocol !== "https:") throw new Error("unsafe checkout url");
    return url.toString();
  } catch { throw new BillingClientError("invalid-billing-response", 502); }
};

export const cancelBillingSubscription = async (): Promise<void> => {
  const response = await fetch("/api/billing/subscription/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  await requireOk(response);
};

export const changeBillingSubscription = async (planId: string): Promise<void> => {
  const response = await fetch("/api/billing/subscription/change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  await requireOk(response);
};
