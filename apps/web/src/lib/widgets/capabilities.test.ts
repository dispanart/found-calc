import { describe, expect, it } from "vitest";

import { commercialLimitsFor } from "@/lib/billing/commercial";
import type { EffectiveCommercialAccess } from "@/lib/billing/contracts";
import {
  selectEffectiveWidgetDomains,
  widgetCapabilitiesForAccess,
} from "./capabilities";

const access = (tier: "friends" | "besties" | "family"): EffectiveCommercialAccess => ({
  tier,
  source: tier === "friends" ? "friends" : "paid",
  keys: [],
  limits: commercialLimitsFor(tier),
  accessUntil: null,
});

describe("widget runtime capabilities", () => {
  it("maps Friends limits without advertising later runtimes", () => {
    expect(widgetCapabilitiesForAccess(access("friends"))).toEqual({
      tier: "friends",
      runtimeAvailable: true,
      maxEffectiveDomains: 1,
      canCustomizeTheme: false,
      canRemoveBranding: false,
      whiteLabelAvailable: false,
      analyticsLevel: "operational",
      bulkManagementAvailable: false,
      publicEventApiAvailable: false,
      portfolioRuntimeAvailable: false,
    });
  });

  it("maps Besties and Family from commercial limits only", () => {
    expect(widgetCapabilitiesForAccess(access("besties"))).toMatchObject({
      tier: "besties",
      maxEffectiveDomains: 3,
      canCustomizeTheme: true,
      canRemoveBranding: true,
      whiteLabelAvailable: false,
      analyticsLevel: "standard",
    });
    expect(widgetCapabilitiesForAccess(access("family"))).toMatchObject({
      tier: "family",
      maxEffectiveDomains: 10,
      canCustomizeTheme: true,
      canRemoveBranding: true,
      whiteLabelAvailable: true,
      analyticsLevel: "advanced",
      bulkManagementAvailable: false,
      publicEventApiAvailable: false,
      portfolioRuntimeAvailable: false,
    });
  });
});

describe("effective widget domain selection", () => {
  const candidates = [
    { domainId: "domain-c", status: "active", verifiedAt: 300, priority: null },
    { domainId: "domain-b", status: "active", verifiedAt: 200, priority: 2 },
    { domainId: "domain-a", status: "active", verifiedAt: 500, priority: 1 },
    { domainId: "domain-disabled", status: "disabled", verifiedAt: 100, priority: 0 },
    { domainId: "domain-revoked", status: "revoked", verifiedAt: 50, priority: 0 },
    { domainId: "domain-pending", status: "pending", verifiedAt: null, priority: 0 },
  ] as const;

  it("prefers explicit priority, then verification time, then stable domain id", () => {
    expect(selectEffectiveWidgetDomains(candidates, 3)).toEqual([
      "domain-a",
      "domain-b",
      "domain-c",
    ]);
  });

  it("restricts capability without mutating or deleting excess candidates", () => {
    expect(selectEffectiveWidgetDomains(candidates, 1)).toEqual(["domain-a"]);
    expect(candidates).toHaveLength(6);
  });

  it("uses verification time and lexical id when no explicit priority exists", () => {
    expect(selectEffectiveWidgetDomains([
      { domainId: "z", status: "active", verifiedAt: 100, priority: null },
      { domainId: "a", status: "active", verifiedAt: 100, priority: null },
      { domainId: "m", status: "active", verifiedAt: 50, priority: null },
    ], 3)).toEqual(["m", "a", "z"]);
  });

  it("returns no effective domains for a zero limit or unverified active record", () => {
    expect(selectEffectiveWidgetDomains(candidates, 0)).toEqual([]);
    expect(selectEffectiveWidgetDomains([
      { domainId: "invalid-active", status: "active", verifiedAt: null, priority: 1 },
    ], 1)).toEqual([]);
  });
});
