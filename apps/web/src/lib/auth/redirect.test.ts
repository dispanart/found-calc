import { describe, expect, it } from "vitest";
import { safeAuthReturnTo } from "./redirect";

describe("safeAuthReturnTo", () => {
  it("keeps same-locale internal paths including calculator query and hash context", () => {
    expect(safeAuthReturnTo("/id/calculators/reference.discount?scenario=promo#hasil", "id"))
      .toBe("/id/calculators/reference.discount?scenario=promo#hasil");
    expect(safeAuthReturnTo("/en/workspace", "en")).toBe("/en/workspace");
  });

  it("falls back for external, protocol-relative, traversal, backslash, encoded-slash, or locale-mismatched targets", () => {
    const badIdTargets = [
      "https://evil.example/steal",
      "//evil.example/steal",
      "javascript:alert(1)",
      "/en/workspace",
      "/id/../api/private",
      "/id/%2e%2e/api/private",
      "/id/%2F%2Fevil.example",
      "/id\\evil.example",
      "\\\\evil.example\\steal",
    ];
    for (const target of badIdTargets) expect(safeAuthReturnTo(target, "id")).toBe("/id/workspace");
  });

  it("uses the localized workspace fallback for missing or malformed input", () => {
    expect(safeAuthReturnTo(undefined, "en")).toBe("/en/workspace");
    expect(safeAuthReturnTo("", "id")).toBe("/id/workspace");
    expect(safeAuthReturnTo("/%E0%A4%A", "id")).toBe("/id/workspace");
  });
});