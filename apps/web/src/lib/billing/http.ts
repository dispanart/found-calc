import type { FoundCalcAuth } from "../auth/server";
import type { BillingPlanDefinition } from "./contracts";
import { resolveBillingEntitlements } from "./entitlements";
import { getBillingPlan, nextBillingAnchorIso, type BillingPlansResult } from "./plans";
import type {
  BillingEventOwner,
  BillingStatusRecord,
  BillingSubscriptionRecord,
  BillingWebhookTransition,
} from "./repository";
import { XenditClientError, type XenditSubscriptionPlanUpdateInput, type XenditSubscriptionSessionInput } from "../xendit/client";
import { parseXenditWebhook } from "../xendit/webhooks";

const MAX_BILLING_BODY_BYTES = 64 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" } as const;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreHeaders });
const error = (code: string, status: number) => json({ error: { code } }, status);

type BillingAuth = Pick<FoundCalcAuth, "api">;
type CheckoutCorrelationInput = { readonly id: string; readonly userId: string; readonly planId: string; readonly referenceId: string; readonly now?: number };

export interface BillingHttpRepository {
  getStatusForUser(userId: string): Promise<BillingStatusRecord>;
  createCheckoutCorrelation(input: CheckoutCorrelationInput): Promise<void>;
  attachProviderSession(userId: string, checkoutId: string, providerSessionId: string, now?: number): Promise<boolean>;
  expireCheckout(userId: string, checkoutId: string, now?: number): Promise<boolean>;
  getSubscriptionForCancellation(userId: string): Promise<BillingSubscriptionRecord | null>;
  markCancellationRequested(userId: string, providerPlanId: string, now?: number): Promise<boolean>;
  stagePlanChange(userId: string, providerPlanId: string, targetPlanId: string, now?: number): Promise<boolean>;
  clearPlanChange(userId: string, providerPlanId: string, targetPlanId: string, now?: number): Promise<boolean>;
  getEventOwner(referenceId: string, providerPlanId: string): Promise<BillingEventOwner | null>;
  applyWebhookTransition(event: BillingWebhookTransition, receivedAt?: number, confirmedPlanId?: string | null): Promise<{ readonly duplicate: boolean; readonly applied: boolean; readonly matched: boolean }>;
}

export interface BillingXenditClient {
  createSubscriptionSession(input: XenditSubscriptionSessionInput): Promise<{ readonly paymentSessionId: string; readonly recurringPlanId: string; readonly referenceId: string; readonly paymentLinkUrl: string }>;
  updateSubscriptionPlan(providerPlanId: string, input: XenditSubscriptionPlanUpdateInput): Promise<void>;
  deactivateSubscription(providerPlanId: string): Promise<void>;
}

export interface BillingHttpServices {
  readonly auth: BillingAuth;
  readonly repository: BillingHttpRepository;
  readonly plans: BillingPlansResult;
  readonly xendit: BillingXenditClient;
  readonly publicAppOrigin?: string;
  readonly webhookToken?: string;
  readonly now?: () => Date;
  readonly randomUUID?: () => string;
}

type BillingStatusServices = Pick<BillingHttpServices, "auth" | "repository" | "plans">;
type BillingCheckoutServices = Pick<BillingHttpServices, "auth" | "repository" | "plans" | "xendit" | "publicAppOrigin" | "now" | "randomUUID">;
type BillingCancelServices = Pick<BillingHttpServices, "auth" | "repository" | "xendit" | "now">;
type BillingChangeServices = Pick<BillingHttpServices, "auth" | "repository" | "plans" | "xendit" | "now">;
type BillingWebhookServices = Pick<BillingHttpServices, "repository" | "plans" | "webhookToken" | "now">;

const authenticate = async (request: Request, services: Pick<BillingHttpServices, "auth">) => {
  const session = await services.auth.api.getSession({ headers: request.headers });
  return session?.user.id
    ? { ok: true as const, user: session.user }
    : { ok: false as const, response: error("authentication-required", 401) };
};

const readJson = async (request: Request) => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BILLING_BODY_BYTES) return { ok: false as const, response: error("payload-too-large", 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BILLING_BODY_BYTES) return { ok: false as const, response: error("payload-too-large", 413) };
  try { return { ok: true as const, value: JSON.parse(text) as unknown }; }
  catch { return { ok: false as const, response: error("invalid-json", 400) }; }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const parseCheckoutBody = (value: unknown): { readonly planId: string; readonly locale: "id" | "en" } | null => {
  if (!isRecord(value) || Object.keys(value).length !== 2 || typeof value.planId !== "string") return null;
  const locale = value.locale;
  if (locale !== "id" && locale !== "en") return null;
  const planId = value.planId.trim();
  return planId.length >= 2 && planId.length <= 64 ? { planId, locale } : null;
};
const parsePlanChangeBody = (value: unknown): { readonly planId: string } | null => {
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.planId !== "string") return null;
  const planId = value.planId.trim();
  return planId.length >= 2 && planId.length <= 64 ? { planId } : null;
};
const isEmptyObject = (value: unknown): boolean => isRecord(value) && Object.keys(value).length === 0;

const publicOrigin = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    const value = new URL(raw);
    if (value.protocol !== "https:" || value.username || value.password || value.search || value.hash) return null;
    return value.origin;
  } catch { return null; }
};

const safeUserReference = async (userId: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return `fcuser${Array.from(new Uint8Array(digest)).slice(0, 24).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

const planResponse = (plan: BillingPlanDefinition) => ({
  id: plan.id,
  displayName: plan.displayName,
  description: plan.description,
  amount: plan.amount,
  currency: plan.currency,
  interval: plan.interval,
  intervalCount: plan.intervalCount,
});

const subscriptionResponse = (subscription: BillingSubscriptionRecord | null) => subscription ? {
  planId: subscription.planId,
  status: subscription.status,
  latestCycleStatus: subscription.latestCycleStatus,
  nextCycleAt: subscription.nextCycleAt,
  cancellationPending: subscription.cancellationRequestedAt !== null,
  pendingPlanId: subscription.pendingPlanId,
} : null;

const statusPayload = (plans: BillingPlansResult, state: BillingStatusRecord) => {
  const configuredPlans = plans.ok ? plans.plans : [];
  const activePlan = state.subscription ? getBillingPlan(configuredPlans, state.subscription.planId) : null;
  return {
    billing: {
      available: plans.ok,
      plans: configuredPlans.map(planResponse),
      subscription: subscriptionResponse(state.subscription),
      checkoutPending: state.checkoutPending,
      entitlements: resolveBillingEntitlements(activePlan, state.subscription?.status ?? null).keys,
    },
  };
};

const handleFailure = (caught: unknown): Response => caught instanceof XenditClientError
  ? error("provider-unavailable", 503)
  : error("storage-unavailable", 503);

export const handleBillingStatusRequest = async (request: Request, services: BillingStatusServices): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    return json(statusPayload(services.plans, await services.repository.getStatusForUser(auth.user.id)));
  } catch (caught) { return handleFailure(caught); }
};

export const handleBillingCheckoutRequest = async (request: Request, services: BillingCheckoutServices): Promise<Response> => {
  let checkoutId: string | null = null;
  let userId: string | null = null;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    userId = auth.user.id;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const checkout = parseCheckoutBody(body.value);
    if (!checkout) return error("invalid-billing-input", 400);
    const { planId, locale } = checkout;
    if (!services.plans.ok) return error("billing-unavailable", 503);
    const plan = getBillingPlan(services.plans.plans, planId);
    if (!plan) return error("billing-plan-not-found", 404);
    const origin = publicOrigin(services.publicAppOrigin);
    if (!origin) return error("billing-unavailable", 503);

    const current = await services.repository.getStatusForUser(auth.user.id);
    if (current.checkoutPending || (current.subscription && current.subscription.status !== "inactive")) return error("billing-conflict", 409);

    const now = services.now?.() ?? new Date();
    const uuid = services.randomUUID?.() ?? crypto.randomUUID();
    checkoutId = uuid;
    const referenceId = `fcbilling${uuid.replace(/[^A-Za-z0-9]/g, "")}`;
    await services.repository.createCheckoutCorrelation({ id: checkoutId, userId: auth.user.id, planId: plan.id, referenceId, now: now.valueOf() });

    const providerSession = await services.xendit.createSubscriptionSession({
      referenceId,
      customerReferenceId: await safeUserReference(auth.user.id),
      ...(auth.user.email ? { customerEmail: auth.user.email } : {}),
      customerGivenNames: auth.user.name?.trim() || "Found Calc member",
      amount: plan.amount,
      currency: plan.currency,
      country: plan.country,
      locale,
      description: plan.displayName.en,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      anchorDate: nextBillingAnchorIso(plan.billingDay, now),
      totalRecurrence: plan.totalRecurrence,
      failedCycleAction: plan.failedCycleAction,
      successReturnUrl: new URL(`/${locale}/workspace/billing?checkout=success`, origin).toString(),
      cancelReturnUrl: new URL(`/${locale}/workspace/billing?checkout=cancelled`, origin).toString(),
    });
    if (providerSession.referenceId !== referenceId) throw new XenditClientError();
    if (!await services.repository.attachProviderSession(auth.user.id, checkoutId, providerSession.paymentSessionId, now.valueOf())) throw new Error("checkout-correlation-missing");
    return json({ checkout: { url: providerSession.paymentLinkUrl } }, 201);
  } catch (caught) {
    if (checkoutId && userId) {
      try { await services.repository.expireCheckout(userId, checkoutId, (services.now?.() ?? new Date()).valueOf()); } catch { /* primary failure wins */ }
    }
    return handleFailure(caught);
  }
};

export const handleBillingChangeRequest = async (request: Request, services: BillingChangeServices): Promise<Response> => {
  let staged: { userId: string; providerPlanId: string; targetPlanId: string } | null = null;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const change = parsePlanChangeBody(body.value);
    if (!change) return error("invalid-billing-input", 400);
    if (!services.plans.ok) return error("billing-unavailable", 503);
    const target = getBillingPlan(services.plans.plans, change.planId);
    if (!target) return error("billing-plan-not-found", 404);
    const state = await services.repository.getStatusForUser(auth.user.id);
    const subscription = state.subscription;
    if (state.checkoutPending || !subscription || subscription.status !== "active" || subscription.cancellationRequestedAt !== null || subscription.pendingPlanId !== null) {
      return error("billing-conflict", 409);
    }
    if (subscription.planId === target.id) return error("billing-conflict", 409);
    const now = (services.now?.() ?? new Date()).valueOf();
    if (!await services.repository.stagePlanChange(auth.user.id, subscription.providerPlanId, target.id, now)) return error("billing-conflict", 409);
    staged = { userId: auth.user.id, providerPlanId: subscription.providerPlanId, targetPlanId: target.id };
    await services.xendit.updateSubscriptionPlan(subscription.providerPlanId, {
      amount: target.amount,
      interval: target.interval,
      intervalCount: target.intervalCount,
      totalRecurrence: target.totalRecurrence,
      failedCycleAction: target.failedCycleAction,
      description: target.displayName.en,
    });
    return json({ planChange: { fromPlanId: subscription.planId, toPlanId: target.id, status: "pending_confirmation" } }, 202);
  } catch (caught) {
    // A provider transport/timeout/5xx outcome is ambiguous: the PATCH may already
    // have been applied. Keep pendingPlanId so an authoritative Xendit webhook can
    // reconcile the new commercial coordinates instead of rejecting them as stale.
    const definitelyRejected = caught instanceof XenditClientError && !caught.requestMayHaveSucceeded;
    if (staged && definitelyRejected) {
      try { await services.repository.clearPlanChange(staged.userId, staged.providerPlanId, staged.targetPlanId, (services.now?.() ?? new Date()).valueOf()); } catch { /* provider failure remains primary */ }
    }
    return handleFailure(caught);
  }
};

export const handleBillingCancelRequest = async (request: Request, services: BillingCancelServices): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isEmptyObject(body.value)) return error("invalid-billing-input", 400);
    const subscription = await services.repository.getSubscriptionForCancellation(auth.user.id);
    if (!subscription) return error("billing-subscription-not-found", 409);
    if (subscription.cancellationRequestedAt === null) {
      await services.xendit.deactivateSubscription(subscription.providerPlanId);
      await services.repository.markCancellationRequested(auth.user.id, subscription.providerPlanId, (services.now?.() ?? new Date()).valueOf());
    }
    return json({ subscription: { planId: subscription.planId, status: subscription.status, cancellationPending: true } });
  } catch (caught) { return handleFailure(caught); }
};

const tokenMatches = (provided: string | null, expected: string | undefined): boolean => {
  if (!expected || expected.length < 16 || !provided || provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  return mismatch === 0;
};

export const handleBillingWebhookRequest = async (request: Request, services: BillingWebhookServices): Promise<Response> => {
  if (!services.webhookToken || services.webhookToken.length < 16) return error("billing-unavailable", 503);
  if (!tokenMatches(request.headers.get("x-callback-token"), services.webhookToken)) return error("webhook-authentication-failed", 401);
  try {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const parsed = parseXenditWebhook(body.value);
    if (!parsed.ok) return error(parsed.code, 400);
    if (!parsed.supported) return json({ accepted: true, applied: false });

    const owner = await services.repository.getEventOwner(parsed.event.referenceId, parsed.event.providerPlanId);
    if (!owner) return json({ accepted: true, applied: false });
    if (!services.plans.ok) return error("billing-unavailable", 503);
    const currentPlan = getBillingPlan(services.plans.plans, owner.planId);
    const pendingPlan = owner.pendingPlanId ? getBillingPlan(services.plans.plans, owner.pendingPlanId) : null;
    if (!currentPlan) return error("billing-unavailable", 503);
    const matchesCurrent = parsed.event.currency === currentPlan.currency && parsed.event.amount === currentPlan.amount;
    const matchesPending = Boolean(pendingPlan && parsed.event.currency === pendingPlan.currency && parsed.event.amount === pendingPlan.amount);
    if (!matchesCurrent && !matchesPending) return error("invalid-webhook", 400);
    const confirmedPlanId = matchesPending && parsed.event.eventName === "recurring.cycle.succeeded" ? pendingPlan?.id ?? null : null;

    const result = await services.repository.applyWebhookTransition(parsed.event, (services.now?.() ?? new Date()).valueOf(), confirmedPlanId);
    return json({ accepted: true, applied: result.applied, duplicate: result.duplicate });
  } catch (caught) { return handleFailure(caught); }
};
