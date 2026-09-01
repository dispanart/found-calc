import { describe, expect, it } from "vitest";

import { parseWidgetDefaults } from "./defaults";

describe("widget default-input policies", () => {
  it("accepts and canonicalizes only safe Discount defaults", () => {
    expect(parseWidgetDefaults("reference.discount", {
      baseAmount: "1200.5",
      discountPercentages: ["10", "2.5000"],
    })).toEqual({
      ok: true,
      value: {
        baseAmount: "1200.50",
        discountPercentages: ["10.0000", "2.5000"],
      },
    });

    expect(parseWidgetDefaults("reference.discount", { finalAmount: "1.00" })).toEqual({
      ok: false,
      code: "unsupported-default-field",
    });
  });

  it("honors Discount engine scale and range metadata", () => {
    expect(parseWidgetDefaults("reference.discount", { baseAmount: "1.001" })).toEqual({ ok: false, code: "invalid-default-value" });
    expect(parseWidgetDefaults("reference.discount", { baseAmount: "-0.01" })).toEqual({ ok: false, code: "invalid-default-value" });
    expect(parseWidgetDefaults("reference.discount", { discountPercentages: ["100.0001"] })).toEqual({ ok: false, code: "invalid-default-value" });
    expect(parseWidgetDefaults("reference.discount", { discountPercentages: "10" })).toEqual({ ok: false, code: "invalid-default-value" });
  });

  it("accepts Business Margin safe fields and enforces selling-price minimum", () => {
    expect(parseWidgetDefaults("reference.business-margin", {
      sellingPrice: "100", productCost: "45.5", variableSellingCostPerOrder: "2",
    })).toEqual({
      ok: true,
      value: { sellingPrice: "100.00", productCost: "45.50", variableSellingCostPerOrder: "2.00" },
    });
    expect(parseWidgetDefaults("reference.business-margin", { sellingPrice: "0.00" })).toEqual({ ok: false, code: "invalid-default-value" });
  });

  it("allows only baseAmount for the synthetic rule calculator", () => {
    expect(parseWidgetDefaults("reference.synthetic-rule", { baseAmount: "99.9" })).toEqual({ ok: true, value: { baseAmount: "99.90" } });
    expect(parseWidgetDefaults("reference.synthetic-rule", { baseAmount: "99.90", effectiveDate: "2026-08-31" })).toEqual({ ok: false, code: "unsupported-default-field" });
  });

  it("rejects non-object defaults and unsupported calculator ids", () => {
    expect(parseWidgetDefaults("reference.discount", null)).toEqual({ ok: false, code: "invalid-defaults" });
    expect(parseWidgetDefaults("reference.discount", [])).toEqual({ ok: false, code: "invalid-defaults" });
    expect(parseWidgetDefaults("reference.unknown" as never, {})).toEqual({ ok: false, code: "invalid-defaults" });
  });

  it("canonicalizes only safe Phase 08A widget defaults", () => {
    expect(parseWidgetDefaults("quick.percentage", { baseValue: "250", percentage: "12.5" })).toEqual({
      ok: true, value: { baseValue: "250.000000", percentage: "12.5000" },
    });
    expect(parseWidgetDefaults("quick.date-difference", { startDate: "2024-02-28", endDate: "2024-03-01" })).toEqual({
      ok: true, value: { startDate: "2024-02-28", endDate: "2024-03-01" },
    });
    expect(parseWidgetDefaults("quick.length-conversion", { value: "1", fromUnit: "in", toUnit: "cm" })).toEqual({
      ok: true, value: { value: "1.000000", fromUnit: "in", toUnit: "cm" },
    });
  });

  it("rejects unsafe Phase 08A widget defaults", () => {
    expect(parseWidgetDefaults("quick.date-difference", { startDate: "2025-02-29" })).toEqual({ ok: false, code: "invalid-default-value" });
    expect(parseWidgetDefaults("quick.length-conversion", { fromUnit: "parsec" })).toEqual({ ok: false, code: "invalid-default-value" });
    expect(parseWidgetDefaults("quick.percentage", { result: "31.25" })).toEqual({ ok: false, code: "unsupported-default-field" });
  });
});
