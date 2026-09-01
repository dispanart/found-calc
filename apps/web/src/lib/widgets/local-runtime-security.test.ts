import { describe, expect, it, vi } from "vitest";

import { resolveEffectiveCommercialAccess } from "@/lib/billing/entitlements";
import { buildWidgetCsp } from "./security";
import { resolvePublicWidgetRuntime } from "./runtime";

const now = 1_800_000_000_000;
const access = resolveEffectiveCommercialAccess({ paidTier: null, subscriptionStatus: null, paidThroughAt: null, trial: null, now });
const widget = {
  id: "widget-local", ownerUserId: "owner-local", publicWidgetKey: "fcw_local_fixture_1234567890123456", publicKeyVersion: 1,
  name: "Local fixture", calculatorId: "reference.discount", locale: "en", status: "active",
  theme: { appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true },
  brandingPreference: "foundcalc", defaultInputConfiguration: { baseAmount: "100.00" }, keyRotatedAt: null, createdAt: now, updatedAt: now,
} as const;
const domain = {
  id: "domain-local", ownerUserId: "owner-local", normalizedHostname: "127.0.0.1", displayHostname: "127.0.0.1:3101", pairKey: "loopback:3101",
  status: "active", verifiedAt: now, createdAt: now, updatedAt: now, deletedAt: null,
} as const;
const services = {
  widgets: { getByPublicKey: vi.fn(async () => widget), listBindings: vi.fn(async () => [{ widgetId: widget.id, domainId: domain.id, priority: 0, createdAt: now }]) },
  domains: { listForOwner: vi.fn(async () => [domain]) },
  access: { getAccess: vi.fn(async () => access) },
};

describe("explicit local-development widget runtime boundary", () => {
  it("allows an allowlisted loopback parent only in development", async () => {
    await expect(resolvePublicWidgetRuntime({ publicWidgetKey: widget.publicWidgetKey, parentOrigin: "http://127.0.0.1:3101", now: new Date(now) }, { ...services, mode: "development", localPorts: [3101] } as never)).resolves.toMatchObject({ ok: true });
    await expect(resolvePublicWidgetRuntime({ publicWidgetKey: widget.publicWidgetKey, parentOrigin: "http://127.0.0.1:3102", now: new Date(now) }, { ...services, mode: "development", localPorts: [3101] } as never)).resolves.toEqual({ ok: false, code: "unavailable" });
    await expect(resolvePublicWidgetRuntime({ publicWidgetKey: widget.publicWidgetKey, parentOrigin: "http://127.0.0.1:3101", now: new Date(now) }, services as never)).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("builds loopback frame ancestry only under the same explicit development allowlist", () => {
    expect(buildWidgetCsp("http://127.0.0.1:3101", undefined, { mode: "development", localPorts: [3101] })).toContain("frame-ancestors http://127.0.0.1:3101");
    expect(() => buildWidgetCsp("http://127.0.0.1:3102", undefined, { mode: "development", localPorts: [3101] })).toThrow();
    expect(() => buildWidgetCsp("http://127.0.0.1:3101")).toThrow();
  });
});
