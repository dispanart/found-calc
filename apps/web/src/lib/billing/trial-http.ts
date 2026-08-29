import type { FoundCalcAuth } from "../auth/server";
import { resolveEffectiveCommercialAccess } from "./entitlements";
import {
  BillingTrialNotEligibleError,
  type BillingTrialRecord,
} from "./repository";

const MAX_TRIAL_BODY_BYTES = 16 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" } as const;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreHeaders });
const error = (code: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ error: { code }, ...extra }, status);

type TrialAuth = Pick<FoundCalcAuth, "api">;

export interface BillingTrialHttpRepository {
  getTrialForUser(userId: string): Promise<BillingTrialRecord | null>;
  hasHistoricalPaidSubscription(userId: string): Promise<boolean>;
  startBestiesTrial(
    userId: string,
    nowMs: number,
  ): Promise<{ readonly started: boolean; readonly trial: BillingTrialRecord }>;
}

export interface BillingTrialHttpServices {
  readonly auth: TrialAuth;
  readonly repository: BillingTrialHttpRepository;
  readonly now?: () => Date;
}

const readEmptyJsonObject = async (request: Request): Promise<boolean> => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_TRIAL_BODY_BYTES) return false;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_TRIAL_BODY_BYTES) return false;
  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
  } catch {
    return false;
  }
};

const commercialFromTrial = (trial: BillingTrialRecord, now: number) =>
  resolveEffectiveCommercialAccess({
    paidTier: null,
    subscriptionStatus: null,
    paidThroughAt: null,
    paidKeys: [],
    trial,
    trialKeys: [],
    now,
    checkoutPending: false,
  });

const trialResponse = (trial: BillingTrialRecord) => ({
  startedAt: trial.startedAt,
  endsAt: trial.endsAt,
  convertedAt: trial.convertedAt,
  eligible: false,
});

export const handleBestiesTrialRequest = async (
  request: Request,
  services: BillingTrialHttpServices,
): Promise<Response> => {
  try {
    const session = await services.auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return error("authentication-required", 401);
    if (!(await readEmptyJsonObject(request))) return error("invalid-billing-input", 400);
    if (session.user.emailVerified !== true) return error("trial-not-eligible", 409);

    const now = (services.now?.() ?? new Date()).valueOf();
    if (!Number.isSafeInteger(now)) return error("trial-not-eligible", 409);

    const existing = await services.repository.getTrialForUser(session.user.id);
    if (existing) {
      return error("trial-already-consumed", 409, {
        trial: trialResponse(existing),
        commercial: commercialFromTrial(existing, now),
      });
    }

    if (await services.repository.hasHistoricalPaidSubscription(session.user.id)) {
      return error("trial-not-eligible", 409);
    }

    const started = await services.repository.startBestiesTrial(session.user.id, now);
    if (!started.started) {
      return error("trial-already-consumed", 409, {
        trial: trialResponse(started.trial),
        commercial: commercialFromTrial(started.trial, now),
      });
    }

    return json({
      trial: trialResponse(started.trial),
      commercial: commercialFromTrial(started.trial, now),
    }, 201);
  } catch (caught) {
    if (caught instanceof BillingTrialNotEligibleError) return error("trial-not-eligible", 409);
    return error("storage-unavailable", 503);
  }
};
