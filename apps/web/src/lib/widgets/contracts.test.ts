import { describe, expect, it } from "vitest";

import {
  isWidgetEventType,
  parseWidgetBrandingPreference,
  parseWidgetTheme,
} from "./contracts";

describe("widget contracts", () => {
  it("accepts only controlled theme tokens", () => {
    expect(parseWidgetTheme({
      appearance: "system",
      accent: "teal",
      density: "compact",
      radiusPreset: "soft",
      showTitle: false,
    })).toEqual({
      ok: true,
      value: {
        appearance: "system",
        accent: "teal",
        density: "compact",
        radiusPreset: "soft",
        showTitle: false,
      },
    });

    expect(parseWidgetTheme({
      appearance: "light",
      accent: "#ff0000",
      density: "comfortable",
      radiusPreset: "standard",
      showTitle: true,
    })).toEqual({ ok: false, code: "invalid-widget-theme" });

    expect(parseWidgetTheme({
      appearance: "light",
      accent: "brand",
      density: "comfortable",
      radiusPreset: "standard",
      showTitle: true,
      css: "body { display:none }",
    })).toEqual({ ok: false, code: "invalid-widget-theme" });
  });

  it("accepts only server-supported branding preferences and analytics events", () => {
    expect(parseWidgetBrandingPreference("foundcalc")).toEqual({ ok: true, value: "foundcalc" });
    expect(parseWidgetBrandingPreference("hidden")).toEqual({ ok: true, value: "hidden" });
    expect(parseWidgetBrandingPreference("custom-logo")).toEqual({
      ok: false,
      code: "invalid-widget-branding",
    });

    expect(isWidgetEventType("widget_viewed")).toBe(true);
    expect(isWidgetEventType("calculation_completed")).toBe(true);
    expect(isWidgetEventType("raw_input_changed")).toBe(false);
  });
});
