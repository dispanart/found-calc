import { describe, expect, it } from "vitest";

import { normalizeWidgetOrigin, widgetOriginMatchesDomain } from "./domain";

describe("widget domain normalization", () => {
  it("normalizes case, trailing dots, and the apex/www pair", () => {
    expect(normalizeWidgetOrigin("https://WWW.Example.COM./", { mode: "production" })).toEqual({
      ok: true,
      value: expect.objectContaining({
        origin: "https://www.example.com",
        hostname: "www.example.com",
        pairKey: "example.com",
        isLocalDevelopment: false,
      }),
    });

    expect(normalizeWidgetOrigin("example.com", { mode: "production" })).toEqual({
      ok: true,
      value: expect.objectContaining({
        origin: "https://example.com",
        hostname: "example.com",
        pairKey: "example.com",
      }),
    });
  });

  it("keeps true subdomains independent", () => {
    const normalized = normalizeWidgetOrigin("https://shop.example.com", { mode: "production" });
    expect(normalized).toEqual({
      ok: true,
      value: expect.objectContaining({ pairKey: "shop.example.com" }),
    });
    expect(widgetOriginMatchesDomain("https://shop.example.com", "example.com")).toBe(false);
    expect(widgetOriginMatchesDomain("https://www.example.com", "example.com")).toBe(true);
  });

  it("canonicalizes internationalized hostnames to ASCII/Punycode", () => {
    expect(normalizeWidgetOrigin("https://bücher.example", { mode: "production" })).toEqual({
      ok: true,
      value: expect.objectContaining({
        hostname: "xn--bcher-kva.example",
        pairKey: "xn--bcher-kva.example",
      }),
    });
  });

  it("requires HTTPS and rejects non-default production ports", () => {
    expect(normalizeWidgetOrigin("http://example.com", { mode: "production" })).toEqual({
      ok: false,
      code: "https-required",
    });
    expect(normalizeWidgetOrigin("https://example.com:8443", { mode: "production" })).toEqual({
      ok: false,
      code: "port-not-allowed",
    });
  });

  it("rejects credentials and non-root URL components", () => {
    for (const value of [
      "https://user:pass@example.com",
      "https://example.com/path",
      "https://example.com/?q=1",
      "https://example.com/#fragment",
    ]) {
      expect(normalizeWidgetOrigin(value, { mode: "production" })).toEqual({
        ok: false,
        code: "invalid-origin",
      });
    }
  });

  it("allows only configured loopback origins in development and scopes identity by port", () => {
    expect(normalizeWidgetOrigin("http://localhost:3100", {
      mode: "development",
      localPorts: [3100],
    })).toEqual({
      ok: true,
      value: expect.objectContaining({
        origin: "http://localhost:3100",
        displayHostname: "localhost:3100",
        pairKey: "loopback:3100",
        isLocalDevelopment: true,
      }),
    });
    expect(normalizeWidgetOrigin("http://127.0.0.1:3100", {
      mode: "development",
      localPorts: [3100],
    })).toEqual({
      ok: true,
      value: expect.objectContaining({
        pairKey: "loopback:3100",
      }),
    });
    expect(normalizeWidgetOrigin("http://127.0.0.1:3101", {
      mode: "development",
      localPorts: [3100],
    })).toEqual({ ok: false, code: "port-not-allowed" });
    expect(normalizeWidgetOrigin("http://example.com:3100", {
      mode: "development",
      localPorts: [3100],
    })).toEqual({ ok: false, code: "https-required" });
  });
});
