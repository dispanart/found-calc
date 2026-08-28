import { describe, expect, it } from "vitest";

import { formatCanonicalDecimal, parseLocaleDecimal } from "./decimal";

describe("locale decimal presentation", () => {
  it("normalizes explicit localized decimal strings", () => {
    expect(parseLocaleDecimal("1.234,50", "id", 2)).toEqual({ ok: true, value: "1234.50" });
    expect(parseLocaleDecimal("10,5", "id", 2)).toEqual({ ok: true, value: "10.50" });
    expect(parseLocaleDecimal("1,234.50", "en", 2)).toEqual({ ok: true, value: "1234.50" });
    expect(parseLocaleDecimal("10.5", "en", 2)).toEqual({ ok: true, value: "10.50" });
  });

  it("rejects ambiguous, malformed, or excessive precision instead of guessing", () => {
    expect(parseLocaleDecimal("1.234", "id", 2)).toEqual({ ok: false, code: "ambiguous" });
    expect(parseLocaleDecimal("1,234", "en", 2)).toEqual({ ok: false, code: "ambiguous" });
    expect(parseLocaleDecimal("1e3", "en", 2)).toEqual({ ok: false, code: "malformed" });
    expect(parseLocaleDecimal("10.005", "en", 2)).toEqual({ ok: false, code: "scale-exceeded" });
    expect(parseLocaleDecimal("10.500", "en", 2)).toEqual({ ok: true, value: "10.50" });
  });

  it("formats canonical truth without changing its digits", () => {
    expect(formatCanonicalDecimal("1234.50", "id")).toBe("1.234,50");
    expect(formatCanonicalDecimal("1234.50", "en")).toBe("1,234.50");
    expect(formatCanonicalDecimal("12.5000", "id", { style: "percent" })).toBe("12,5000%");
  });
});
