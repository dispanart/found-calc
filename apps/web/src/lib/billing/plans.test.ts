import { describe, expect, it } from "vitest";
import { nextBillingAnchorIso, parseBillingPlansJson } from "./plans";

const offer = (id: string, name: "Pro" | "Business", amount: number, intervalCount: number, entitlements = ["fixture.export"]) => ({
  id,
  displayName: { id: name, en: name },
  description: { id: `Akses ${name}`, en: `${name} access` },
  amount,
  currency: "IDR",
  country: "ID",
  interval: "MONTH",
  intervalCount,
  billingDay: 15,
  totalRecurrence: null,
  failedCycleAction: "RESUME",
  entitlements,
});
const validPlans = [
  offer("pro-monthly", "Pro", 25_000, 1, ["fixture.export", "fixture.export"]),
  offer("pro-annual", "Pro", 250_000, 12),
  offer("business-monthly", "Business", 75_000, 1, ["fixture.export", "fixture.team"]),
  offer("business-annual", "Business", 750_000, 12, ["fixture.export", "fixture.team"]),
];

describe("billing plan configuration", () => {
  it("fails closed unless all four approved V1 paid offers and exact commercial coordinates are present", () => {
    expect(parseBillingPlansJson(undefined).ok).toBe(false);
    expect(parseBillingPlansJson("not-json").ok).toBe(false);
    expect(parseBillingPlansJson(JSON.stringify(validPlans.slice(0, 3))).ok).toBe(false);
    expect(parseBillingPlansJson(JSON.stringify(validPlans.map((plan, index) => index === 0 ? { ...plan, amount: 25_001 } : plan))).ok).toBe(false);
    expect(parseBillingPlansJson(JSON.stringify(validPlans.map((plan, index) => index === 1 ? { ...plan, intervalCount: 1 } : plan))).ok).toBe(false);
    expect(parseBillingPlansJson(JSON.stringify(validPlans.map((plan, index) => index === 0 ? { ...plan, displayName: { id: "Premium", en: "Premium" } } : plan))).ok).toBe(false);
    expect(parseBillingPlansJson(JSON.stringify(validPlans.map((plan, index) => index === 0 ? { ...plan, billingDay: 29 } : plan))).ok).toBe(false);
  });

  it("normalizes the canonical order and deduplicates capability keys", () => {
    const parsed = parseBillingPlansJson(JSON.stringify([...validPlans].reverse()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.plans.map((plan) => [plan.id, plan.amount, plan.intervalCount])).toEqual([
      ["pro-monthly", 25_000, 1],
      ["pro-annual", 250_000, 12],
      ["business-monthly", 75_000, 1],
      ["business-annual", 750_000, 12],
    ]);
    expect(parsed.plans[0]?.entitlements).toEqual(["fixture.export"]);
  });

  it("derives the next anchor in Asia/Jakarta for days 1..28", () => {
    expect(nextBillingAnchorIso(15, new Date("2026-08-14T16:59:59.000Z"))).toBe("2026-08-15T00:00:00.000+07:00");
    expect(nextBillingAnchorIso(15, new Date("2026-08-15T00:00:01.000Z"))).toBe("2026-09-15T00:00:00.000+07:00");
    expect(() => nextBillingAnchorIso(29, new Date())).toThrow(/billing day/i);
  });
});
