import { describe, expect, it } from "vitest";

import {
  generatePublicWidgetKey,
  generateVerificationChallenge,
  isPublicWidgetKey,
  isVerificationChallenge,
} from "./identity";

describe("widget opaque identities", () => {
  it("generates non-enumerable public widget keys with at least 128 bits of random material", () => {
    const first = generatePublicWidgetKey();
    const second = generatePublicWidgetKey();

    expect(first).not.toBe(second);
    expect(first.startsWith("fcw_")).toBe(true);
    expect(first.length).toBeGreaterThanOrEqual(26);
    expect(isPublicWidgetKey(first)).toBe(true);
    expect(isPublicWidgetKey("fcw_123")).toBe(false);
    expect(isPublicWidgetKey("user_123@example.com")).toBe(false);
  });

  it("generates separate opaque DNS verification challenges", () => {
    const challenge = generateVerificationChallenge();
    expect(challenge.startsWith("fcv_")).toBe(true);
    expect(challenge.length).toBeGreaterThanOrEqual(26);
    expect(isVerificationChallenge(challenge)).toBe(true);
    expect(isVerificationChallenge("fcv_short")).toBe(false);
    expect(isPublicWidgetKey(challenge)).toBe(false);
  });
});
