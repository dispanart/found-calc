import { describe, expect, it, vi } from "vitest";

import { resolveEffectiveCommercialAccess } from "@/lib/billing/entitlements";
import type { StoredWidgetDomain } from "./domain-repository";
import type { StoredWidget, StoredWidgetDomainBinding } from "./widget-repository";
import { DEFAULT_WIDGET_THEME, resolvePublicWidgetRuntime } from "./runtime";

const now = 1_800_000_000_000;
const customTheme = {
  appearance: "dark",
  accent: "teal",
  density: "compact",
  radiusPreset: "soft",
  showTitle: false,
} as const;

const accessFor = (tier: "friends" | "besties" | "family") => resolveEffectiveCommercialAccess({
  paidTier: tier === "friends" ? null : tier === "besties" ? "pro" : "business",
  subscriptionStatus: tier === "friends" ? null : "active",
  paidThroughAt: null,
  trial: null,
  now,
});

const widget = (overrides: Partial<StoredWidget> = {}): StoredWidget => ({
  id: "widget-1",
  ownerUserId: "owner-1",
  publicWidgetKey: "fcw_current_key_fixture_1234567890",
  publicKeyVersion: 2,
  name: "Discount embed",
  calculatorId: "reference.discount",
  locale: "en",
  status: "active",
  theme: customTheme,
  brandingPreference: "hidden",
  defaultInputConfiguration: { baseAmount: "100.00", discountPercentages: ["10.0000"] },
  keyRotatedAt: now - 10_000,
  createdAt: now - 100_000,
  updatedAt: now - 10_000,
  ...overrides,
});

const domain = (id: string, hostname: string, overrides: Partial<StoredWidgetDomain> = {}): StoredWidgetDomain => ({
  id,
  ownerUserId: "owner-1",
  normalizedHostname: hostname,
  displayHostname: hostname,
  pairKey: hostname.startsWith("www.") ? hostname.slice(4) : hostname,
  status: "active",
  verifiedAt: now - 50_000,
  createdAt: now - 100_000,
  updatedAt: now - 50_000,
  deletedAt: null,
  ...overrides,
});

const binding = (domainId: string, priority: number): StoredWidgetDomainBinding => ({
  widgetId: "widget-1",
  domainId,
  priority,
  createdAt: now - 50_000,
});

const services = (input: {
  storedWidget?: StoredWidget | null;
  domains?: readonly StoredWidgetDomain[];
  bindings?: readonly StoredWidgetDomainBinding[];
  tier?: "friends" | "besties" | "family";
} = {}) => ({
  widgets: {
    getByPublicKey: vi.fn(async () => input.storedWidget === undefined ? widget() : input.storedWidget),
    listBindings: vi.fn(async () => input.bindings ?? [binding("domain-1", 0)]),
  },
  domains: {
    listForOwner: vi.fn(async () => input.domains ?? [domain("domain-1", "example.com")]),
  },
  access: {
    getAccess: vi.fn(async () => accessFor(input.tier ?? "friends")),
  },
});

const resolve = (runtimeServices: ReturnType<typeof services>, parentOrigin = "https://example.com") =>
  resolvePublicWidgetRuntime({
    publicWidgetKey: "fcw_current_key_fixture_1234567890",
    parentOrigin,
    now: new Date(now),
  }, runtimeServices as never);

describe("public widget runtime authorization", () => {
  it("forces Friends branding and theme while preserving safe defaults", async () => {
    await expect(resolve(services({ tier: "friends" }))).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({
        widgetId: "widget-1",
        publicWidgetKey: "fcw_current_key_fixture_1234567890",
        calculatorId: "reference.discount",
        locale: "en",
        parentOrigin: "https://example.com",
        domainId: "domain-1",
        theme: DEFAULT_WIDGET_THEME,
        branding: "foundcalc",
        defaults: { baseAmount: "100.00", discountPercentages: ["10.0000"] },
        analyticsLevel: "operational",
      }),
    });
  });

  it.each([
    ["besties", "standard"],
    ["family", "advanced"],
  ] as const)("applies %s controlled customization and analytics", async (tier, analyticsLevel) => {
    const result = await resolve(services({ tier }));
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        theme: customTheme,
        branding: "hidden",
        analyticsLevel,
      }),
    });
  });

  it("accepts the apex/www pair but rejects sibling subdomains", async () => {
    await expect(resolve(services(), "https://www.example.com")).resolves.toMatchObject({ ok: true });
    await expect(resolve(services(), "https://blog.example.com")).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("denies domains outside the current entitlement-limited deterministic subset", async () => {
    const runtimeServices = services({
      tier: "friends",
      domains: [domain("domain-1", "first.example"), domain("domain-2", "second.example")],
      bindings: [binding("domain-1", 0), binding("domain-2", 1)],
    });
    await expect(resolve(runtimeServices, "https://second.example")).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("recomputes an expired Besties trial as Friends before authorizing domains", async () => {
    const runtimeServices = services({
      domains: [domain("domain-1", "first.example"), domain("domain-2", "second.example")],
      bindings: [binding("domain-1", 0), binding("domain-2", 1)],
    });
    runtimeServices.access.getAccess.mockResolvedValue(resolveEffectiveCommercialAccess({
      paidTier: null,
      subscriptionStatus: null,
      paidThroughAt: null,
      trial: {
        startedAt: now - 15 * 86_400_000,
        endsAt: now - 86_400_000,
        convertedAt: null,
      },
      now,
    }));
    await expect(resolve(runtimeServices, "https://second.example")).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it.each([
    ["unknown key", null, [domain("domain-1", "example.com")] as readonly StoredWidgetDomain[]],
    ["disabled widget", widget({ status: "disabled" }), [domain("domain-1", "example.com")] as readonly StoredWidgetDomain[]],
    ["revoked widget", widget({ status: "revoked" }), [domain("domain-1", "example.com")] as readonly StoredWidgetDomain[]],
    ["disabled domain", widget(), [domain("domain-1", "example.com", { status: "disabled" })] as readonly StoredWidgetDomain[]],
    ["unverified domain", widget(), [domain("domain-1", "example.com", { verifiedAt: null })] as readonly StoredWidgetDomain[]],
  ] as const)("collapses %s to the generic public error", async (_label, storedWidget, domains) => {
    await expect(resolve(services({ storedWidget, domains }))).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("treats a rotated old public key exactly like an unknown key", async () => {
    const runtimeServices = services({ storedWidget: null });
    await expect(resolvePublicWidgetRuntime({
      publicWidgetKey: "fcw_old_rotated_key_fixture_1234567890",
      parentOrigin: "https://example.com",
      now: new Date(now),
    }, runtimeServices as never)).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("fails closed on invalid stored calculator/default data and repository failures", async () => {
    await expect(resolve(services({ storedWidget: widget({ calculatorId: "reference.unknown" }) }))).resolves.toEqual({ ok: false, code: "unavailable" });
    const runtimeServices = services();
    runtimeServices.widgets.getByPublicKey.mockRejectedValue(new Error("db unavailable"));
    await expect(resolve(runtimeServices)).resolves.toEqual({ ok: false, code: "unavailable" });
  });
});
