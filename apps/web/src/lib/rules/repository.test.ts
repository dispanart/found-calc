import { describe, expect, it } from "vitest";
import { parseSupportedRuleDraft } from "./payload";

const valid = {
  ruleId: "reference.synthetic-rate",
  versionId: "2027-a",
  effectiveFrom: "2027-01-01",
  payload: { ratePercent: "8.25" },
  provenance: { sourceId: "synthetic-admin-test", sourceUrl: "https://example.test/source" },
};

describe("parseSupportedRuleDraft", () => {
  it("accepts the one Phase 05 supported synthetic rule shape", () => {
    expect(parseSupportedRuleDraft(valid)).toEqual({ ok: true, value: valid });
  });

  it("rejects extra keys and rates outside the canonical 0..100 scale-4 range", () => {
    expect(parseSupportedRuleDraft({ ...valid, extra: true })).toEqual({ ok: false, code: "invalid-rule-draft" });
    expect(parseSupportedRuleDraft({ ...valid, payload: { ratePercent: "100.0001" } })).toEqual({ ok: false, code: "invalid-rule-draft" });
    expect(parseSupportedRuleDraft({ ...valid, payload: { ratePercent: "7.50000" } })).toEqual({ ok: false, code: "invalid-rule-draft" });
    expect(parseSupportedRuleDraft({ ...valid, payload: { ratePercent: "7.5", hidden: "x" } })).toEqual({ ok: false, code: "invalid-rule-draft" });
  });
});
