import type { BillingWebhookTransition } from "../billing/repository";

export type XenditBillingWebhookEvent = BillingWebhookTransition & {
  readonly amount: number;
  readonly currency: string;
};

export type XenditWebhookParseResult =
  | { readonly ok: true; readonly supported: true; readonly event: XenditBillingWebhookEvent }
  | { readonly ok: true; readonly supported: false; readonly eventName: string }
  | { readonly ok: false; readonly code: "invalid-webhook" };

const PLAN_EVENTS = new Set(["recurring.plan.activated", "recurring.plan.inactivated"]);
const CYCLE_EVENTS = new Set([
  "recurring.cycle.created",
  "recurring.cycle.retrying",
  "recurring.cycle.succeeded",
  "recurring.cycle.failed",
  "recurring.cycle.force_attempt_failed",
]);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 255): string | null => typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
const timestamp = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const safeAmount = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const eventSemantics = (eventName: string): { status: BillingWebhookTransition["nextStatus"]; rank: number } => {
  switch (eventName) {
    case "recurring.plan.activated": return { status: "active", rank: 20 };
    case "recurring.plan.inactivated": return { status: "inactive", rank: 40 };
    case "recurring.cycle.created": return { status: null, rank: 10 };
    case "recurring.cycle.succeeded": return { status: "active", rank: 20 };
    case "recurring.cycle.retrying":
    case "recurring.cycle.failed":
    case "recurring.cycle.force_attempt_failed": return { status: "past_due", rank: 30 };
    default: return { status: null, rank: 0 };
  }
};

const expectedStatus = (eventName: string, status: string): boolean => {
  switch (eventName) {
    case "recurring.plan.activated": return status === "ACTIVE";
    case "recurring.plan.inactivated": return status === "INACTIVE";
    case "recurring.cycle.created": return status === "SCHEDULED" || status === "PENDING";
    case "recurring.cycle.retrying": return status === "RETRYING";
    case "recurring.cycle.succeeded": return status === "SUCCEEDED";
    case "recurring.cycle.failed": return status === "FAILED";
    case "recurring.cycle.force_attempt_failed": return status === "FAILED" || status === "RETRYING";
    default: return false;
  }
};

export const parseXenditWebhook = (value: unknown): XenditWebhookParseResult => {
  if (!isRecord(value)) return { ok: false, code: "invalid-webhook" };
  const eventName = text(value.event, 80);
  if (!eventName) return { ok: false, code: "invalid-webhook" };
  if (!PLAN_EVENTS.has(eventName) && !CYCLE_EVENTS.has(eventName)) return { ok: true, supported: false, eventName };
  if (!isRecord(value.data)) return { ok: false, code: "invalid-webhook" };
  const data = value.data;
  const status = text(data.status, 32);
  const referenceId = text(data.reference_id, 64);
  const providerObjectId = text(data.id, 255);
  const amount = safeAmount(data.amount);
  const currency = text(data.currency, 8);
  if (!status || !referenceId || !providerObjectId || amount === null || !currency || !expectedStatus(eventName, status)) {
    return { ok: false, code: "invalid-webhook" };
  }

  const providerPlanId = PLAN_EVENTS.has(eventName) ? providerObjectId : text(data.plan_id, 255);
  if (!providerPlanId) return { ok: false, code: "invalid-webhook" };
  const providerCycleId = CYCLE_EVENTS.has(eventName) ? providerObjectId : null;
  const envelopeCreated = timestamp(value.created);
  const providerCreatedAt = timestamp(data.created);
  const providerUpdatedAt = timestamp(data.updated);
  const providerEventAt = providerUpdatedAt ?? providerCreatedAt ?? envelopeCreated;
  if (providerEventAt === null) return { ok: false, code: "invalid-webhook" };
  const scheduledAt = timestamp(data.scheduled_timestamp);
  const semantics = eventSemantics(eventName);
  const dedupeKey = `${eventName}:${providerCycleId ?? providerPlanId}:${providerEventAt}:${status}`;

  return {
    ok: true,
    supported: true,
    event: {
      dedupeKey,
      eventName,
      providerPlanId,
      providerCycleId,
      referenceId,
      providerEventAt,
      nextStatus: semantics.status,
      latestCycleStatus: CYCLE_EVENTS.has(eventName) ? status : null,
      currentCycleStartedAt: CYCLE_EVENTS.has(eventName) ? providerCreatedAt : null,
      nextCycleAt: scheduledAt,
      providerCreatedAt,
      providerUpdatedAt,
      rank: semantics.rank,
      amount,
      currency,
    },
  };
};
