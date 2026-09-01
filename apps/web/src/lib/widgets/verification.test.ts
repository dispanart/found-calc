import { describe, expect, it } from "vitest";

import {
  createVerificationExpiry,
  isVerificationCheckAllowed,
  isVerificationExpired,
  verifyDnsTxtChallenge,
  verifyLocalDevelopmentOrigin,
} from "./verification";

describe("widget domain verification", () => {
  it("matches an exact Found Calc token across DNS TXT fragments", async () => {
    const result = await verifyDnsTxtChallenge({
      hostname: "example.com",
      challengeToken: "fcv_expected_token",
      resolveTxt: async (name) => {
        expect(name).toBe("_foundcalc-verification.example.com");
        return [["foundcalc-site-verification=fcv_", "expected_token"], ["other=value"]];
      },
    });
    expect(result).toEqual({ ok: true, verified: true });
  });

  it("distinguishes missing token, missing record and transient resolver failure", async () => {
    expect(await verifyDnsTxtChallenge({
      hostname: "example.com", challengeToken: "fcv_expected", resolveTxt: async () => [["other=value"]],
    })).toEqual({ ok: true, verified: false, code: "token-not-found" });

    expect(await verifyDnsTxtChallenge({
      hostname: "example.com", challengeToken: "fcv_expected", resolveTxt: async () => [],
    })).toEqual({ ok: true, verified: false, code: "record-not-found" });

    expect(await verifyDnsTxtChallenge({
      hostname: "example.com", challengeToken: "fcv_expected", resolveTxt: async () => { throw new Error("dns timeout"); },
    })).toEqual({ ok: false, code: "resolver-unavailable" });
  });

  it("uses a 72-hour challenge lifetime and a 30-second server check throttle", () => {
    const createdAt = 1_000_000;
    const expiresAt = createVerificationExpiry(createdAt);
    expect(expiresAt - createdAt).toBe(72 * 60 * 60 * 1000);
    expect(isVerificationExpired(expiresAt, expiresAt - 1)).toBe(false);
    expect(isVerificationExpired(expiresAt, expiresAt)).toBe(true);
    expect(isVerificationCheckAllowed(null, createdAt)).toBe(true);
    expect(isVerificationCheckAllowed(createdAt, createdAt + 29_999)).toBe(false);
    expect(isVerificationCheckAllowed(createdAt, createdAt + 30_000)).toBe(true);
  });

  it("permits only explicit normalized loopback origins for local-development verification", () => {
    expect(verifyLocalDevelopmentOrigin({
      origin: "http://localhost:3100", hostname: "localhost", displayHostname: "localhost", pairKey: "localhost", isLocalDevelopment: true,
    })).toEqual({ ok: true, verified: true });
    expect(verifyLocalDevelopmentOrigin({
      origin: "https://example.com", hostname: "example.com", displayHostname: "example.com", pairKey: "example.com", isLocalDevelopment: false,
    })).toEqual({ ok: false, code: "local-origin-required" });
  });
});
