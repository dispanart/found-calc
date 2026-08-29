import { describe, expect, it, vi } from "vitest";
import { createXenditClient } from "./client";

const update = {
  amount: 250_000,
  interval: "MONTH" as const,
  intervalCount: 12,
  totalRecurrence: null,
  failedCycleAction: "RESUME" as const,
  description: "Pro annual",
};

describe("Xendit mutation outcome classification", () => {
  it("marks a transport failure as possibly applied because the provider may have received the PATCH", async () => {
    const client = createXenditClient({
      secretApiKey: "test-secret",
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("connection reset after write")),
    });

    await expect(client.updateSubscriptionPlan("rp-1", update)).rejects.toMatchObject({
      code: "provider-unavailable",
      requestMayHaveSucceeded: true,
    });
  });

  it("marks a provider 4xx response as definitely rejected", async () => {
    const client = createXenditClient({
      secretApiKey: "test-secret",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 400, headers: { "content-type": "application/json" } })),
    });

    await expect(client.updateSubscriptionPlan("rp-1", update)).rejects.toMatchObject({
      code: "provider-unavailable",
      requestMayHaveSucceeded: false,
    });
  });
});
