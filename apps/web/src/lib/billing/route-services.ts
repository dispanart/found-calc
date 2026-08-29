import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

import { getFoundCalcAuth } from "@/lib/auth/server";
import { createBillingRepository } from "./repository";
import { parseBillingPlansJson } from "./plans";
import { createXenditClient, XenditClientError } from "../xendit/client";
import type { BillingHttpServices, BillingXenditClient } from "./http";

type BillingWorkerEnv = {
  readonly DB: D1Database;
  readonly BILLING_PLANS_JSON?: string;
  readonly PUBLIC_APP_ORIGIN?: string;
  readonly XENDIT_SECRET_API_KEY?: string;
  readonly XENDIT_WEBHOOK_TOKEN?: string;
};
const workerEnv = () => env as unknown as BillingWorkerEnv;
const repository = () => createBillingRepository(workerEnv().DB);
const plans = () => parseBillingPlansJson(workerEnv().BILLING_PLANS_JSON);

const unavailableXendit: BillingXenditClient = {
  createSubscriptionSession: async () => { throw new XenditClientError(); },
  deactivateSubscription: async () => { throw new XenditClientError(); },
};
const provider = (): BillingXenditClient => {
  const secretApiKey = workerEnv().XENDIT_SECRET_API_KEY;
  return secretApiKey ? createXenditClient({ secretApiKey }) : unavailableXendit;
};

export const getBillingStatusRouteServices = () => ({
  auth: getFoundCalcAuth(),
  repository: repository(),
  plans: plans(),
}) satisfies Pick<BillingHttpServices, "auth" | "repository" | "plans">;

export const getBillingCheckoutRouteServices = () => ({
  ...getBillingStatusRouteServices(),
  xendit: provider(),
  ...(workerEnv().PUBLIC_APP_ORIGIN ? { publicAppOrigin: workerEnv().PUBLIC_APP_ORIGIN } : {}),
}) satisfies Pick<BillingHttpServices, "auth" | "repository" | "plans" | "xendit" | "publicAppOrigin">;

export const getBillingCancelRouteServices = () => ({
  auth: getFoundCalcAuth(),
  repository: repository(),
  xendit: provider(),
}) satisfies Pick<BillingHttpServices, "auth" | "repository" | "xendit">;

export const getBillingWebhookRouteServices = () => ({
  repository: repository(),
  plans: plans(),
  ...(workerEnv().XENDIT_WEBHOOK_TOKEN ? { webhookToken: workerEnv().XENDIT_WEBHOOK_TOKEN } : {}),
}) satisfies Pick<BillingHttpServices, "repository" | "plans" | "webhookToken">;

export const billingRouteFailure = () =>
  Response.json(
    { error: { code: "service-unavailable" } },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
