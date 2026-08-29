import { describe, expect, it } from "vitest";
import { nextBillingAnchorIso, parseBillingPlansJson } from "./plans";

const validPlan = { id: "fixture-pro", displayName: { id: "Fixture Pro", en: "Fixture Pro" }, description: { id: "Hanya pengujian", en: "Testing only" }, amount: 10000, currency: "IDR", country: "ID", interval: "MONTH", intervalCount: 1, billingDay: 15, totalRecurrence: null, failedCycleAction: "RESUME", entitlements: ["fixture.export", "fixture.export", "fixture.team"] };

describe("billing plan configuration", () => {
  it("fails closed for missing, malformed, duplicate, or unsafe plan configuration", () => {
    expect(parseBillingPlansJson(undefined).ok).toBe(false); expect(parseBillingPlansJson("not-json").ok).toBe(false); expect(parseBillingPlansJson(JSON.stringify([{ ...validPlan, amount: 0 }])).ok).toBe(false); expect(parseBillingPlansJson(JSON.stringify([{ ...validPlan, billingDay: 29 }])).ok).toBe(false); expect(parseBillingPlansJson(JSON.stringify([{ ...validPlan, currency: "USD" }])).ok).toBe(false); expect(parseBillingPlansJson(JSON.stringify([validPlan, validPlan])).ok).toBe(false); expect(parseBillingPlansJson(JSON.stringify([{ ...validPlan, extra: true }])).ok).toBe(false);
  });
  it("normalizes valid plans and deduplicates entitlement keys", () => expect(parseBillingPlansJson(JSON.stringify([validPlan]))).toEqual({ ok: true, plans: [{ ...validPlan, entitlements: ["fixture.export", "fixture.team"] }] }));
  it("derives the next monthly anchor in Asia/Jakarta for days 1..28", () => { expect(nextBillingAnchorIso(15, new Date("2026-08-14T16:59:59.000Z"))).toBe("2026-08-15T00:00:00.000+07:00"); expect(nextBillingAnchorIso(15, new Date("2026-08-15T00:00:01.000Z"))).toBe("2026-09-15T00:00:00.000+07:00"); expect(() => nextBillingAnchorIso(29, new Date())).toThrow(/billing day/i); });
});
