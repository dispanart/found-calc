import { syntheticRateRuleVersions } from "@found-calc/rules";
import { describe, expect, it } from "vitest";

import { runBusinessMargin, runDiscount, runSyntheticRule } from "@/lib/calculators/runtime";

const publicDiscount = (input: Parameters<typeof runDiscount>[0]) => runDiscount(input);
const widgetDiscount = (input: Parameters<typeof runDiscount>[0]) => runDiscount(input);
const publicMargin = (input: Parameters<typeof runBusinessMargin>[0]) => runBusinessMargin(input);
const widgetMargin = (input: Parameters<typeof runBusinessMargin>[0]) => runBusinessMargin(input);
const publicRule = (input: Parameters<typeof runSyntheticRule>[0]) => runSyntheticRule(input, syntheticRateRuleVersions);
const widgetRule = (input: Parameters<typeof runSyntheticRule>[0]) => runSyntheticRule(input, syntheticRateRuleVersions);

describe("Phase 07B public/widget calculator parity", () => {
  it("returns the identical complete discount outcome for identical canonical input", () => {
    const input = { baseAmount: "125.00", discountPercentages: ["10", "20"] } as const;
    expect(widgetDiscount(input)).toEqual(publicDiscount(input));
  });

  it("returns the identical complete business-margin outcome for identical canonical input", () => {
    const input = {
      sellingPrice: "175.00",
      productCost: "92.50",
      variableSellingCostPerOrder: "18.25",
    } as const;
    expect(widgetMargin(input)).toEqual(publicMargin(input));
  });

  it("returns the identical complete synthetic-rule outcome and provenance for identical rule versions", () => {
    const input = { baseAmount: "240.00", effectiveDate: "2026-06-01" } as const;
    const publicOutcome = publicRule(input);
    const widgetOutcome = widgetRule(input);
    expect(widgetOutcome).toEqual(publicOutcome);
    expect(widgetOutcome.ok).toBe(true);
    if (!widgetOutcome.ok) throw new Error("expected synthetic rule success");
    expect(widgetOutcome.result.ruleDependencies?.[0]?.versionId).toBe("2026-a");
  });
});
