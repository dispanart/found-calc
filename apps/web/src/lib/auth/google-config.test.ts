import { describe, expect, it } from "vitest";
import { googleAuthOptionsFromEnv, trustedOriginFromBaseURL } from "./google-config";

describe("Phase 07A Google auth configuration", () => {
  it("stays disabled unless both server credentials are present", () => {
    expect(googleAuthOptionsFromEnv(undefined, undefined)).toBeNull();
    expect(googleAuthOptionsFromEnv("client-id", undefined)).toBeNull();
    expect(googleAuthOptionsFromEnv(undefined, "client-secret")).toBeNull();
    expect(googleAuthOptionsFromEnv("  ", "client-secret")).toBeNull();
    expect(googleAuthOptionsFromEnv("client-id", "  ")).toBeNull();
  });

  it("returns a narrow Google provider config only when both values are non-empty", () => {
    expect(googleAuthOptionsFromEnv("  client-id  ", "  client-secret  ")).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("derives only an HTTP(S) trusted origin from the configured Better Auth base URL", () => {
    expect(trustedOriginFromBaseURL("https://found.example/auth/path")).toBe("https://found.example");
    expect(trustedOriginFromBaseURL("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(trustedOriginFromBaseURL("ftp://found.example")).toBeNull();
    expect(trustedOriginFromBaseURL("not-a-url")).toBeNull();
  });
});