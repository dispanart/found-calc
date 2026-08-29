import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBillingStatus, parseBillingStatusPayload, startBillingCheckout, cancelBillingSubscription } from "./client";

const payload = {
  billing: {
    available: true,
    plans: [{ id: "fixture-pro", displayName: { id: "Fixture Pro", en: "Fixture Pro" }, description: { id: "Uji", en: "Test" }, amount: 10000, currency: "IDR", interval: "MONTH", intervalCount: 1 }],
    subscription: { planId: "fixture-pro", status: "active", latestCycleStatus: null, nextCycleAt: null, cancellationPending: false, pendingPlanId: null },
    checkoutPending: false,
    entitlements: ["fixture.export"],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("billing client", () => {
  it("strictly parses browser-safe billing status", () => {
    expect(parseBillingStatusPayload(payload)).toEqual(payload.billing);
    expect(parseBillingStatusPayload({ billing: { ...payload.billing, providerPlanId: "secret" } })).toBeNull();
    expect(parseBillingStatusPayload({ billing: { ...payload.billing, plans: [{ ...payload.billing.plans[0], amount: -1 }] } })).toBeNull();
  });

  it("fetches no-store status and rejects malformed payloads", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchBillingStatus()).resolves.toEqual(payload.billing);
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/status", expect.objectContaining({ cache: "no-store" }));
  });

  it("starts localized checkout only from an HTTPS provider URL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ checkout: { url: "https://payments.xendit.co/session/1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(startBillingCheckout("fixture-pro", "en")).resolves.toBe("https://payments.xendit.co/session/1");
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ planId: "fixture-pro", locale: "en" });
  });

  it("cancels without sending provider identity", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ subscription: { planId: "fixture-pro", status: "active", cancellationPending: true } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await cancelBillingSubscription();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.body).toBe("{}");
  });
});
