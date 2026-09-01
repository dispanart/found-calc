import { describe, expect, it, vi } from "vitest";

import { resolveEffectiveCommercialAccess } from "@/lib/billing/entitlements";
import type { StoredWidgetDomain, StoredWidgetVerification } from "./domain-repository";
import {
  handleWidgetDomainVerifyRequest,
  handleWidgetDomainsRequest,
  handleWidgetsRequest,
} from "./http";

const defaultTheme = {
  appearance: "system",
  accent: "brand",
  density: "comfortable",
  radiusPreset: "standard",
  showTitle: true,
} as const;

const accessFor = (tier: "friends" | "besties" | "family") => {
  const now = 1_800_000_000_000;
  if (tier === "friends") {
    return resolveEffectiveCommercialAccess({
      paidTier: null,
      subscriptionStatus: null,
      paidThroughAt: null,
      trial: null,
      now,
    });
  }
  return resolveEffectiveCommercialAccess({
    paidTier: tier === "besties" ? "pro" : "business",
    subscriptionStatus: "active",
    paidThroughAt: null,
    trial: null,
    now,
  });
};

const sessionAuth = (userId: string | null) => ({
  api: {
    getSession: vi.fn(async () => userId ? { user: { id: userId } } : null),
  },
});

const baseServices = (tier: "friends" | "besties" | "family" = "friends") => ({
  auth: sessionAuth("owner"),
  access: { getAccess: vi.fn(async () => accessFor(tier)) },
  domains: {
    listForOwner: vi.fn(async () => []),
    getForOwner: vi.fn(async (): Promise<StoredWidgetDomain | null> => null),
    create: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    createVerification: vi.fn(),
    getPendingVerification: vi.fn(async (): Promise<StoredWidgetVerification | null> => null),
    recordVerificationCheck: vi.fn(),
    completeVerification: vi.fn(),
  },
  widgets: {
    listForOwner: vi.fn(async () => []),
    getForOwner: vi.fn(async () => null),
    getByPublicKey: vi.fn(),
    create: vi.fn(async (input) => ({
      id: "widget-1",
      publicKeyVersion: 1,
      keyRotatedAt: null,
      updatedAt: input.createdAt,
      ...input,
    })),
    update: vi.fn(),
    rotatePublicKey: vi.fn(),
    bindDomain: vi.fn(),
    unbindDomain: vi.fn(),
    listBindings: vi.fn(async () => []),
  },
  analytics: { summarize: vi.fn(async () => []) },
  resolveTxt: vi.fn(async () => []),
  now: () => 100_000,
  mode: "production" as const,
  localPorts: [] as readonly number[],
});

describe("widget management HTTP", () => {
  it("requires authentication and always disables caching", async () => {
    const services = baseServices();
    services.auth = sessionAuth(null);
    const response = await handleWidgetDomainsRequest(new Request("https://foundcalc.test/api/workspace/widget-domains"), services as never);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: { code: "authentication-required" } });
  });

  it("forces Friends branding/default theme instead of trusting paid settings", async () => {
    const services = baseServices("friends");
    const response = await handleWidgetsRequest(new Request("https://foundcalc.test/api/workspace/widgets", {
      method: "POST",
      body: JSON.stringify({
        name: "Discount embed",
        calculatorId: "reference.discount",
        locale: "en",
        brandingPreference: "hidden",
        theme: {
          appearance: "dark",
          accent: "teal",
          density: "compact",
          radiusPreset: "square",
          showTitle: false,
        },
        defaults: { baseAmount: "100.5" },
      }),
      headers: { "content-type": "application/json" },
    }), services as never);

    expect(response.status).toBe(201);
    expect(services.widgets.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: "owner",
      brandingPreference: "foundcalc",
      theme: defaultTheme,
      defaultInputConfiguration: { baseAmount: "100.50" },
    }));
  });

  it("allows Besties controlled theme and branding removal", async () => {
    const services = baseServices("besties");
    const theme = {
      appearance: "dark",
      accent: "teal",
      density: "compact",
      radiusPreset: "soft",
      showTitle: false,
    } as const;
    const response = await handleWidgetsRequest(new Request("https://foundcalc.test/api/workspace/widgets", {
      method: "POST",
      body: JSON.stringify({
        name: "Margin embed",
        calculatorId: "reference.business-margin",
        locale: "id",
        brandingPreference: "hidden",
        theme,
        defaults: { sellingPrice: "100" },
      }),
    }), services as never);
    expect(response.status).toBe(201);
    expect(services.widgets.create).toHaveBeenCalledWith(expect.objectContaining({
      brandingPreference: "hidden",
      theme,
    }));
  });

  it("rejects malformed JSON before touching repositories", async () => {
    const services = baseServices();
    const response = await handleWidgetsRequest(new Request("https://foundcalc.test/api/workspace/widgets", {
      method: "POST",
      body: "{",
    }), services as never);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid-json" } });
    expect(services.widgets.create).not.toHaveBeenCalled();
  });

  it("throttles DNS verification checks before resolving TXT", async () => {
    const services = baseServices();
    services.domains.getForOwner.mockResolvedValue({
      id: "domain-1",
      ownerUserId: "owner",
      normalizedHostname: "example.com",
      displayHostname: "example.com",
      pairKey: "example.com",
      status: "pending",
      verifiedAt: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    });
    services.domains.getPendingVerification.mockResolvedValue({
      id: "verification-1",
      domainId: "domain-1",
      method: "dns_txt",
      challengeToken: "fcv_fixture",
      status: "pending",
      expiresAt: 200_000,
      lastCheckedAt: 90_000,
      verifiedAt: null,
      createdAt: 1,
    });

    const response = await handleWidgetDomainVerifyRequest(
      new Request("https://foundcalc.test/api/workspace/widget-domains/domain-1/verify", { method: "POST" }),
      "domain-1",
      services as never,
    );
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: { code: "verification-check-too-soon" } });
    expect(services.resolveTxt).not.toHaveBeenCalled();
  });
});
