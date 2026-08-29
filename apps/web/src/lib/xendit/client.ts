export type XenditSubscriptionSessionInput = {
  readonly referenceId: string;
  readonly customerReferenceId: string;
  readonly customerEmail?: string;
  readonly customerGivenNames: string;
  readonly amount: number;
  readonly currency: "IDR";
  readonly country: "ID";
  readonly locale: "id" | "en";
  readonly description: string;
  readonly interval: "MONTH";
  readonly intervalCount: number;
  readonly anchorDate: string;
  readonly totalRecurrence: number | null;
  readonly failedCycleAction: "RESUME" | "STOP";
  readonly successReturnUrl: string;
  readonly cancelReturnUrl: string;
};

export type XenditSubscriptionSession = {
  readonly paymentSessionId: string;
  readonly recurringPlanId: string;
  readonly referenceId: string;
  readonly paymentLinkUrl: string;
};

export class XenditClientError extends Error {
  readonly code = "provider-unavailable" as const;
  constructor() { super("provider-unavailable"); }
}

type FetchLike = typeof fetch;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown, max = 255): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const isHttpsUrl = (value: unknown): value is string => {
  if (!nonEmpty(value, 2048)) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

export const createXenditClient = ({
  secretApiKey,
  fetchImpl = fetch,
  baseUrl = "https://api.xendit.co",
  timeoutMs = 10_000,
}: {
  readonly secretApiKey: string;
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}) => {
  if (!secretApiKey) throw new XenditClientError();
  const authorization = `Basic ${btoa(`${secretApiKey}:`)}`;

  const request = async (path: string, init: RequestInit): Promise<unknown> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          authorization,
          "content-type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      if (!response.ok) throw new XenditClientError();
      try { return await response.json(); } catch { throw new XenditClientError(); }
    } catch (error) {
      if (error instanceof XenditClientError) throw error;
      throw new XenditClientError();
    } finally {
      clearTimeout(timeout);
    }
  };

  const createSubscriptionSession = async (input: XenditSubscriptionSessionInput): Promise<XenditSubscriptionSession> => {
    if (!nonEmpty(input.referenceId, 64) || !/^[A-Za-z0-9]+$/.test(input.customerReferenceId)) throw new XenditClientError();
    if (!nonEmpty(input.customerGivenNames, 80) || !Number.isSafeInteger(input.amount) || input.amount <= 0) throw new XenditClientError();
    for (const value of [input.successReturnUrl, input.cancelReturnUrl]) if (!isHttpsUrl(value)) throw new XenditClientError();

    const payload = {
      reference_id: input.referenceId,
      session_type: "SUBSCRIPTION",
      mode: "PAYMENT_LINK",
      amount: input.amount,
      currency: input.currency,
      country: input.country,
      customer: {
        reference_id: input.customerReferenceId,
        type: "INDIVIDUAL",
        ...(input.customerEmail ? { email: input.customerEmail } : {}),
        individual_detail: { given_names: input.customerGivenNames },
      },
      locale: input.locale,
      description: input.description,
      subscription: {
        schedule: {
          interval: input.interval,
          interval_count: input.intervalCount,
          ...(input.totalRecurrence === null ? {} : { total_recurrence: input.totalRecurrence }),
          anchor_date: input.anchorDate,
        },
        failed_cycle_action: input.failedCycleAction,
      },
      success_return_url: input.successReturnUrl,
      cancel_return_url: input.cancelReturnUrl,
    };
    const value = await request("/sessions", { method: "POST", body: JSON.stringify(payload) });
    if (!isRecord(value)
      || !nonEmpty(value.payment_session_id)
      || !nonEmpty(value.recurring_plan_id)
      || !nonEmpty(value.reference_id, 64)
      || !isHttpsUrl(value.payment_link_url)) throw new XenditClientError();
    return {
      paymentSessionId: value.payment_session_id,
      recurringPlanId: value.recurring_plan_id,
      referenceId: value.reference_id,
      paymentLinkUrl: value.payment_link_url,
    };
  };

  const deactivateSubscription = async (providerPlanId: string): Promise<void> => {
    if (!nonEmpty(providerPlanId, 255)) throw new XenditClientError();
    await request(`/recurring/plans/${encodeURIComponent(providerPlanId)}/deactivate`, {
      method: "POST",
      headers: { "api-version": "2026-01-01" },
    });
  };

  return { createSubscriptionSession, deactivateSubscription };
};
