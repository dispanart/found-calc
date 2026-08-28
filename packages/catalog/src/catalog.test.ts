import { describe, expect, it } from "vitest";

import {
  getReferenceCalculatorById,
  getReferenceCalculatorBySlug,
  referenceCatalog,
} from "./catalog";

describe("Phase 03 reference catalog", () => {
  it("keeps three unique localized reference calculators with valid relationships", () => {
    expect(referenceCatalog).toHaveLength(3);
    expect(referenceCatalog.map((entry) => entry.slug)).toEqual([
      "discount",
      "business-margin",
      "synthetic-rule-reference",
    ]);
    expect(new Set(referenceCatalog.map((entry) => entry.id)).size).toBe(3);
    expect(new Set(referenceCatalog.map((entry) => entry.slug)).size).toBe(3);

    for (const entry of referenceCatalog) {
      expect(entry.copy.id.title.length).toBeGreaterThan(0);
      expect(entry.copy.en.title.length).toBeGreaterThan(0);
      expect(Object.keys(entry.copy.id.fields).length).toBeGreaterThan(0);
      expect(Object.keys(entry.copy.en.results).length).toBeGreaterThan(0);
      expect(getReferenceCalculatorBySlug(entry.slug)?.id).toBe(entry.id);
      expect(getReferenceCalculatorById(entry.id)?.slug).toBe(entry.slug);
      for (const relatedId of entry.relatedCalculatorIds) {
        expect(referenceCatalog.some((candidate) => candidate.id === relatedId)).toBe(true);
        expect(relatedId).not.toBe(entry.id);
      }
    }
  });

  it("marks only the synthetic reference as rule-based demo data", () => {
    const synthetic = getReferenceCalculatorBySlug("synthetic-rule-reference");
    expect(synthetic?.classification).toBe("rule-based");
    expect(synthetic?.syntheticWarning).toBe(true);

    for (const entry of referenceCatalog.filter((item) => item.id !== "reference.synthetic-rule")) {
      expect(entry.classification).toBe("exact/deterministic");
      expect(entry.syntheticWarning).toBe(false);
    }
  });
});
