import { describe, expect, it } from "vitest";
import { parseXenditWebhook } from "./webhooks";

const basePlan = {
  event: "recurring.plan.activated",
  created: "2026-08-14T10:01:00.000Z",
  data: {
    id: "rp-1",
    reference_id: "ref-1",
    status: "ACTIVE",
    amount: 10000,
    currency: "IDR",
    created: "2026-08-14T10:00:30.000Z",
    updated: "2026-08-14T10:01:00.000Z",
  },
};

describe("Xendit webhook normalization", () => {
  it("maps plan activation to active first-party state", () => {
    const parsed = parseXenditWebhook(basePlan);
    expect(parsed).toMatchObject({ ok: true, supported: true, event: { providerPlanId: "rp-1", referenceId: "ref-1", nextStatus: "active", amount: 10000, currency: "IDR", rank: 20 } });
  });

  it("maps cycle retries to past due and preserves plan/cycle identity", () => {
    const parsed = parseXenditWebhook({
      event: "recurring.cycle.retrying",
      data: {
        id: "cycle-1",
        plan_id: "rp-1",
        reference_id: "ref-1",
        status: "RETRYING",
        amount: 10000,
        currency: "IDR",
        created: "2026-09-15T01:00:00.000Z",
        updated: "2026-09-15T01:02:00.000Z",
        scheduled_timestamp: "2026-09-16T01:00:00.000Z",
      },
    });
    expect(parsed).toMatchObject({ ok: true, supported: true, event: { providerPlanId: "rp-1", providerCycleId: "cycle-1", nextStatus: "past_due", latestCycleStatus: "RETRYING", rank: 30 } });
  });

  it("acknowledges unknown events but rejects malformed supported events", () => {
    expect(parseXenditWebhook({ event: "recurring.plan.created", data: {} })).toEqual({ ok: true, supported: false, eventName: "recurring.plan.created" });
    expect(parseXenditWebhook({ ...basePlan, data: { ...basePlan.data, amount: "10000" } })).toEqual({ ok: false, code: "invalid-webhook" });
  });
});
