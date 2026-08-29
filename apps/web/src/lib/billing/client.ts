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
  readonly cancellationPending: boolean;
  readonly pendingPlanId: string | null;
};

export type BillingStatusClient = {
  readonly available: boolean;
  readonly plans: readonly BillingPlanClient[];
  readonly subscription: BillingSubscriptionClient | null;
  readonly checkoutPending: boolean;
  readonly entitlements: readonly string[];
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
const nullableTimestamp = (value: unknown): value is number | null => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);

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
  if (!isRecord(value) || !hasOnlyKeys(value, ["planId", "status", "latestCycleStatus", "nextCycleAt", "cancellationPending", "pendingPlanId"])) return undefined;
  if (!nonEmpty(value.planId, 64)) return undefined;
  if (value.status !== "pending" && value.status !== "active" && value.status !== "past_due" && value.status !== "inactive") return undefined;
  if (value.latestCycleStatus !== null && !nonEmpty(value.latestCycleStatus, 64)) return undefined;
  if (!nullableTimestamp(value.nextCycleAt) || typeof value.cancellationPending !== "boolean") return undefined;
  if (value.pendingPlanId !== null && !nonEmpty(value.pendingPlanId, 64)) return undefined;
  return {
    planId: value.planId.trim(),
    status: value.status,
    latestCycleStatus: value.latestCycleStatus === null ? null : value.latestCycleStatus.trim(),
    nextCycleAt: value.nextCycleAt,
    cancellationPending: value.cancellationPending,
    pendingPlanId: value.pendingPlanId === null ? null : value.pendingPlanId.trim(),
  };
};

export const parseBillingStatusPayload = (value: unknown): BillingStatusClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["billing"]) || !isRecord(value.billing)) return null;
  const billing = value.billing;
  if (!hasOnlyKeys(billing, ["available", "plans", "subscription", "checkoutPending", "entitlements"])) return null;
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
  return { available: billing.available, plans, subscription, checkoutPending: billing.checkoutPending, entitlements };
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
