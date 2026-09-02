import { describe, expect, it } from "vitest";

import {
  localDraftKey,
  readLocalDraft,
  removeLocalDraft,
  writeLocalDraft,
  type LocalStorageLike,
} from "./local-draft";

class MemoryStorage implements LocalStorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("local calculator drafts", () => {
  it("round-trips a schema-versioned draft under the calculator namespace", () => {
    const storage = new MemoryStorage();
    const draft = {
      calculatorId: "reference.discount" as const,
      locale: "id" as const,
      fields: { baseAmount: "1.234,50", discounts: ["10", "5,5"] },
    };

    expect(writeLocalDraft(draft, storage)).toBe(true);
    expect(storage.values.has(localDraftKey("reference.discount"))).toBe(true);
    expect(readLocalDraft("reference.discount", storage)).toEqual(draft);
  });

  it("ignores malformed and unknown-schema storage without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(localDraftKey("reference.synthetic-rule"), "{not-json");
    expect(readLocalDraft("reference.synthetic-rule", storage)).toBeNull();

    storage.setItem(localDraftKey("reference.synthetic-rule"), JSON.stringify({
      schemaVersion: 999,
      calculatorId: "reference.synthetic-rule",
      locale: "en",
      fields: { baseAmount: "100", effectiveDate: "2026-08-28" },
    }));
    expect(readLocalDraft("reference.synthetic-rule", storage)).toBeNull();
  });

  it("removes only the requested calculator draft", () => {
    const storage = new MemoryStorage();
    writeLocalDraft({
      calculatorId: "reference.business-margin",
      locale: "en",
      fields: { sellingPrice: "100", productCost: "60", variableCost: "", scenarioVariableCost: "" },
    }, storage);

    expect(removeLocalDraft("reference.business-margin", storage)).toBe(true);
    expect(readLocalDraft("reference.business-margin", storage)).toBeNull();
  });

  it("round-trips calculator-specific Phase 08A drafts without a generic fields bag", () => {
    const storage = new MemoryStorage();
    const drafts = [
      { calculatorId: "quick.percentage" as const, locale: "id" as const, fields: { baseValue: "250", percentage: "12,5" } },
      { calculatorId: "quick.date-difference" as const, locale: "en" as const, fields: { startDate: "2024-02-28", endDate: "2024-03-01" } },
      { calculatorId: "quick.length-conversion" as const, locale: "en" as const, fields: { value: "1", fromUnit: "in", toUnit: "cm" } },
    ];
    for (const draft of drafts) {
      expect(writeLocalDraft(draft, storage)).toBe(true);
      expect(readLocalDraft(draft.calculatorId, storage)).toEqual(draft);
    }
  });
});
