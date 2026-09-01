import { describe, expect, it, vi } from "vitest";

import { resolveEffectiveCommercialAccess } from "@/lib/billing/entitlements";
import type { StoredWidget } from "./widget-repository";
import { DEFAULT_WIDGET_THEME, resolveWidgetPreviewRuntime } from "./runtime";

const now = 1_800_000_000_000;
const customTheme = { appearance: "dark", accent: "teal", density: "compact", radiusPreset: "soft", showTitle: false } as const;
const stored: StoredWidget = {
  id: "widget-1", ownerUserId: "owner-1", publicWidgetKey: "fcw_current_key_fixture_1234567890", publicKeyVersion: 2,
  name: "Preview", calculatorId: "reference.discount", locale: "en", status: "disabled", theme: customTheme,
  brandingPreference: "hidden", defaultInputConfiguration: { baseAmount: "100.00" }, keyRotatedAt: null,
  createdAt: now - 1000, updatedAt: now - 100,
};

const access = (tier: "friends" | "besties") => resolveEffectiveCommercialAccess({
  paidTier: tier === "friends" ? null : "pro", subscriptionStatus: tier === "friends" ? null : "active",
  paidThroughAt: null, trial: null, now,
});

const services = (input: { widget?: StoredWidget | null; tier?: "friends" | "besties" } = {}) => ({
  widgets: {
    getForOwner: vi.fn(async (owner: string, id: string) => owner === "owner-1" && id === "widget-1" ? (input.widget === undefined ? stored : input.widget) : null),
    getByPublicKey: vi.fn(), listBindings: vi.fn(),
  },
  domains: { listForOwner: vi.fn() },
  access: { getAccess: vi.fn(async () => access(input.tier ?? "friends")) },
});

describe("owner widget preview runtime", () => {
  it("allows an owner to preview a disabled widget while applying current Friends downgrade", async () => {
    await expect(resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "owner-1", now: new Date(now) }, services() as never)).resolves.toMatchObject({
      calculatorId: "reference.discount",
      theme: DEFAULT_WIDGET_THEME,
      branding: "foundcalc",
      defaults: { baseAmount: "100.00" },
      analyticsLevel: "operational",
    });
  });

  it("applies Besties controlled appearance and branding without public-domain authorization", async () => {
    const result = await resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "owner-1", now: new Date(now) }, services({ tier: "besties" }) as never);
    expect(result).toMatchObject({ theme: customTheme, branding: "hidden", analyticsLevel: "standard" });
  });

  it("rejects the wrong owner, revoked widgets, invalid stored defaults, and repository failures", async () => {
    await expect(resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "other-owner", now: new Date(now) }, services() as never)).resolves.toBeNull();
    await expect(resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "owner-1", now: new Date(now) }, services({ widget: { ...stored, status: "revoked" } }) as never)).resolves.toBeNull();
    await expect(resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "owner-1", now: new Date(now) }, services({ widget: { ...stored, defaultInputConfiguration: { unknown: "1" } } }) as never)).resolves.toBeNull();
    const broken = services();
    broken.widgets.getForOwner.mockRejectedValue(new Error("db unavailable"));
    await expect(resolveWidgetPreviewRuntime({ widgetId: "widget-1", ownerUserId: "owner-1", now: new Date(now) }, broken as never)).resolves.toBeNull();
  });
});
