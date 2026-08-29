import { describe, expect, it } from "vitest";

import {
  commercialLimitsFor,
  internalPaidTierToCommercialTier,
  publicPlanName,
} from "./commercial";

describe("Phase 07A commercial model", () => {
  it("uses the approved public names", () => {
    expect(publicPlanName("friends")).toBe("Friends");
    expect(publicPlanName("besties")).toBe("Besties");
    expect(publicPlanName("family")).toBe("Family");
  });

  it("keeps historical paid-family mapping separate from public naming", () => {
    expect(internalPaidTierToCommercialTier("pro")).toBe("besties");
    expect(internalPaidTierToCommercialTier("business")).toBe("family");
  });

  it("caps Friends persistence and distribution without deleting data", () => {
    expect(commercialLimitsFor("friends")).toMatchObject({
      savedCalculations: 5,
      activeGoals: 1,
      activeProjects: 1,
      widgetDomains: 1,
      removeWidgetBranding: false,
      portfolioEnabled: false,
    });
  });

  it("keeps Besties and Family operationally distinct", () => {
    expect(commercialLimitsFor("besties")).toMatchObject({
      savedCalculations: null,
      activeGoals: null,
      activeProjects: null,
      widgetDomains: 3,
      portfolioEnabled: false,
      whiteLabelWidgets: false,
    });
    expect(commercialLimitsFor("family")).toMatchObject({
      widgetDomains: 10,
      portfolioEnabled: true,
      whiteLabelWidgets: true,
      teamSeats: 2,
    });
  });
});
