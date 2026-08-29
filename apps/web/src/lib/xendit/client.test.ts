import { describe, expect, it, vi } from "vitest";
import { createXenditClient, XenditClientError } from "./client";

const sessionInput = {
  referenceId: "fcbillingabc123",
  customerReferenceId: "fcuserabc123",
  customerEmail: "dina@example.test",
  customerGivenNames: "Dina",
  amount: 10000,
  currency: "IDR" as const,
  country: "ID" as const,
  locale: "id" as const,
  description: "Fixture Pro",
  interval: "MONTH" as const,
  intervalCount: 1,
  anchorDate: "2026-09-15T00:00:00.000+07:00",
  totalRecurrence: null,
  failedCycleAction: "RESUME" as const,
  successReturnUrl: "https://found.example/workspace/billing?checkout=success",
  cancelReturnUrl: "https://found.example/workspace/billing?checkout=cancelled",
};

describe("Xendit client", () => {
  it("creates a hosted subscription session without leaking the secret into the body", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      payment_session_id: "ps-1",
      recurring_plan_id: "rp-1",
      reference_id: sessionInput.referenceId,
      payment_link_url: "https://payments.xendit.co/session/ps-1",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createXenditClient({ secretApiKey: "xnd-test-secret", fetchImpl });
    await expect(client.createSubscriptionSession(sessionInput)).resolves.toEqual({
      paymentSessionId: "ps-1",
      recurringPlanId: "rp-1",
      referenceId: sessionInput.referenceId,
      paymentLinkUrl: "https://payments.xendit.co/session/ps-1",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.xendit.co/sessions");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      reference_id: sessionInput.referenceId,
      session_type: "SUBSCRIPTION",
      mode: "PAYMENT_LINK",
      amount: 10000,
      currency: "IDR",
      country: "ID",
      subscription: { schedule: { interval: "MONTH", interval_count: 1, anchor_date: sessionInput.anchorDate } },
    });
    expect(String(init?.body)).not.toContain("xnd-test-secret");
    expect(new Headers(init?.headers).get("authorization")).toMatch(/^Basic /);
  });

  it("uses the 2026 recurring deactivation endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const client = createXenditClient({ secretApiKey: "secret", fetchImpl });
    await client.deactivateSubscription("rp-1");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.xendit.co/recurring/plans/rp-1/deactivate");
    expect(new Headers(init?.headers).get("api-version")).toBe("2026-01-01");
  });


  it("updates an existing subscription for annual upgrade/downgrade without creating a second session", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "rp-1", status: "ACTIVE" }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createXenditClient({ secretApiKey: "secret", fetchImpl });
    await client.updateSubscriptionPlan("rp-1", {
      amount: 250_000, interval: "MONTH", intervalCount: 12, totalRecurrence: null, failedCycleAction: "RESUME", description: "Pro",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.xendit.co/recurring/plans/rp-1");
    expect(init?.method).toBe("PATCH");
    expect(new Headers(init?.headers).get("api-version")).toBe("2026-01-01");
    expect(JSON.parse(String(init?.body))).toEqual({
      amount: 250000, description: "Pro", schedule: { interval: "MONTH", interval_count: 12 }, failed_cycle_action: "RESUME",
    });
  });

  it("rejects unsafe return URLs and normalizes provider failures", async () => {
    const client = createXenditClient({ secretApiKey: "secret", fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response("bad", { status: 502 })) });
    await expect(client.createSubscriptionSession({ ...sessionInput, successReturnUrl: "http://found.example/ok" })).rejects.toBeInstanceOf(XenditClientError);
    await expect(client.createSubscriptionSession(sessionInput)).rejects.toMatchObject({ code: "provider-unavailable" });
  });
});
