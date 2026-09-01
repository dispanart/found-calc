import { describe, expect, it } from "vitest";

import { buildWidgetCsp, isAllowedEmbedHostPath, isEmbedHostRequest } from "./security";

describe("widget security policy", () => {
  it("builds a first-party CSP with one exact frame ancestor and no wildcard", () => {
    const csp = buildWidgetCsp("https://customer.example");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("frame-ancestors https://customer.example");
    expect(csp).not.toContain("frame-ancestors *");
  });

  it("rejects CSP directive injection and supports an explicit nonce", () => {
    expect(() => buildWidgetCsp("https://customer.example; script-src *")).toThrow();
    expect(buildWidgetCsp("https://customer.example", "nonceFixture123"))
      .toContain("script-src 'self' 'nonce-nonceFixture123'");
  });

  it("matches only the configured embed origin and rejects configured userinfo", () => {
    expect(isEmbedHostRequest(new URL("https://embed.foundcalc.test/embed/key"), "https://embed.foundcalc.test")).toBe(true);
    expect(isEmbedHostRequest(new URL("https://app.foundcalc.test/embed/key"), "https://embed.foundcalc.test")).toBe(false);
    expect(isEmbedHostRequest(new URL("https://embed.foundcalc.test.evil.example/embed/key"), "https://embed.foundcalc.test")).toBe(false);
    expect(isEmbedHostRequest(new URL("https://embed.foundcalc.test/embed/key"), "https://user:pass@embed.foundcalc.test")).toBe(false);
  });

  it("allows only the dedicated embed-origin route surface", () => {
    expect(isAllowedEmbedHostPath("/embed/fcw_fixture", "GET")).toBe(true);
    expect(isAllowedEmbedHostPath("/embed.js", "GET")).toBe(true);
    expect(isAllowedEmbedHostPath("/api/embed/events", "POST")).toBe(true);
    expect(isAllowedEmbedHostPath("/api/rules/reference.synthetic", "GET")).toBe(true);
    expect(isAllowedEmbedHostPath("/_next/static/chunk.js", "GET")).toBe(true);
    expect(isAllowedEmbedHostPath("/favicon.ico", "GET")).toBe(true);

    expect(isAllowedEmbedHostPath("/api/rules/reference.synthetic", "POST")).toBe(false);
    expect(isAllowedEmbedHostPath("/api/auth/session", "GET")).toBe(false);
    expect(isAllowedEmbedHostPath("/api/workspace/widgets", "GET")).toBe(false);
    expect(isAllowedEmbedHostPath("/api/billing/status", "GET")).toBe(false);
    expect(isAllowedEmbedHostPath("/admin", "GET")).toBe(false);
    expect(isAllowedEmbedHostPath("/en/workspace", "GET")).toBe(false);
  });
});