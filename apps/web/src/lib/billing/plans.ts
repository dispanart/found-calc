import type { BillingPlanDefinition } from "./contracts";

export type BillingPlansResult =
  | { readonly ok: true; readonly plans: readonly BillingPlanDefinition[] }
  | { readonly ok: false; readonly code: "billing-unavailable" };

const PLAN_KEYS = new Set([
  "id", "displayName", "description", "amount", "currency", "country", "interval",
  "intervalCount", "billingDay", "totalRecurrence", "failedCycleAction", "entitlements",
]);
const LOCALIZED_KEYS = new Set(["id", "en"]);
const PLAN_ID = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const ENTITLEMENT_KEY = /^[a-z0-9][a-z0-9._:-]{1,127}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: Set<string>): boolean =>
  Object.keys(value).every((key) => allowed.has(key));

const boundedText = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
};

const parseLocalized = (value: unknown, max: number): { id: string; en: string } | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, LOCALIZED_KEYS)) return null;
  const id = boundedText(value.id, max);
  const en = boundedText(value.en, max);
  return id && en ? { id, en } : null;
};

const parsePlan = (value: unknown): BillingPlanDefinition | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, PLAN_KEYS)) return null;
  const id = boundedText(value.id, 64);
  const displayName = parseLocalized(value.displayName, 80);
  const description = parseLocalized(value.description, 320);
  if (!id || !PLAN_ID.test(id) || !displayName || !description) return null;
  if (!Number.isSafeInteger(value.amount) || Number(value.amount) <= 0) return null;
  if (value.currency !== "IDR" || value.country !== "ID" || value.interval !== "MONTH") return null;
  if (!Number.isSafeInteger(value.intervalCount) || Number(value.intervalCount) < 1 || Number(value.intervalCount) > 24) return null;
  if (!Number.isSafeInteger(value.billingDay) || Number(value.billingDay) < 1 || Number(value.billingDay) > 28) return null;
  if (value.totalRecurrence !== null && (!Number.isSafeInteger(value.totalRecurrence) || Number(value.totalRecurrence) < 1)) return null;
  if (value.failedCycleAction !== "RESUME" && value.failedCycleAction !== "STOP") return null;
  if (!Array.isArray(value.entitlements) || value.entitlements.length > 64) return null;
  const entitlements: string[] = [];
  for (const item of value.entitlements) {
    const normalized = boundedText(item, 128);
    if (!normalized || !ENTITLEMENT_KEY.test(normalized)) return null;
    if (!entitlements.includes(normalized)) entitlements.push(normalized);
  }
  return {
    id,
    displayName,
    description,
    amount: Number(value.amount),
    currency: "IDR",
    country: "ID",
    interval: "MONTH",
    intervalCount: Number(value.intervalCount),
    billingDay: Number(value.billingDay),
    totalRecurrence: value.totalRecurrence === null ? null : Number(value.totalRecurrence),
    failedCycleAction: value.failedCycleAction,
    entitlements,
  };
};

export const parseBillingPlansJson = (raw: string | undefined): BillingPlansResult => {
  if (!raw || raw.length > 64 * 1024) return { ok: false, code: "billing-unavailable" };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, code: "billing-unavailable" }; }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 32) return { ok: false, code: "billing-unavailable" };
  const plans: BillingPlanDefinition[] = [];
  const ids = new Set<string>();
  for (const candidate of parsed) {
    const plan = parsePlan(candidate);
    if (!plan || ids.has(plan.id)) return { ok: false, code: "billing-unavailable" };
    ids.add(plan.id);
    plans.push(plan);
  }
  return { ok: true, plans };
};

export const getBillingPlan = (
  plans: readonly BillingPlanDefinition[],
  planId: string,
): BillingPlanDefinition | null => plans.find((plan) => plan.id === planId) ?? null;

export const nextBillingAnchorIso = (billingDay: number, now = new Date()): string => {
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) throw new RangeError("billing day must be an integer from 1 through 28");
  if (Number.isNaN(now.valueOf())) throw new RangeError("now must be a valid date");
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let year = jakartaNow.getUTCFullYear();
  let month = jakartaNow.getUTCMonth();
  const candidateUtcMs = () => Date.UTC(year, month, billingDay - 1, 17, 0, 0, 0);
  if (candidateUtcMs() <= now.getTime()) {
    month += 1;
    if (month === 12) { month = 0; year += 1; }
  }
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(billingDay).padStart(2, "0");
  return `${year}-${mm}-${dd}T00:00:00.000+07:00`;
};
