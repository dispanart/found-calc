export type WidgetStatus = "active" | "disabled" | "revoked";
export type WidgetDomainStatus = "pending" | "active" | "disabled" | "revoked";
export type WidgetBrandingPreference = "foundcalc" | "hidden";
export type WidgetAppearance = "light" | "dark" | "system";
export type WidgetDensity = "comfortable" | "compact";
export type WidgetRadiusPreset = "standard" | "soft" | "square";
export type WidgetAccent = "brand" | "blue" | "teal";
export type WidgetAnalyticsLevel = "operational" | "standard" | "advanced";
export type WidgetEventType =
  | "widget_viewed"
  | "calculator_started"
  | "calculation_completed"
  | "cta_clicked";

export interface WidgetTheme {
  readonly appearance: WidgetAppearance;
  readonly accent: WidgetAccent;
  readonly density: WidgetDensity;
  readonly radiusPreset: WidgetRadiusPreset;
  readonly showTitle: boolean;
}

export interface NormalizedWidgetOrigin {
  readonly origin: string;
  readonly hostname: string;
  readonly displayHostname: string;
  readonly pairKey: string;
  readonly isLocalDevelopment: boolean;
}

export type WidgetParseResult<T, C extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: C };

const APPEARANCES = new Set<WidgetAppearance>(["light", "dark", "system"]);
const ACCENTS = new Set<WidgetAccent>(["brand", "blue", "teal"]);
const DENSITIES = new Set<WidgetDensity>(["comfortable", "compact"]);
const RADII = new Set<WidgetRadiusPreset>(["standard", "soft", "square"]);
const BRANDING = new Set<WidgetBrandingPreference>(["foundcalc", "hidden"]);
const EVENTS = new Set<WidgetEventType>([
  "widget_viewed",
  "calculator_started",
  "calculation_completed",
  "cta_clicked",
]);
const THEME_KEYS = new Set(["appearance", "accent", "density", "radiusPreset", "showTitle"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseWidgetTheme = (
  value: unknown,
): WidgetParseResult<WidgetTheme, "invalid-widget-theme"> => {
  if (!isRecord(value)) return { ok: false, code: "invalid-widget-theme" };
  const keys = Object.keys(value);
  if (keys.length !== THEME_KEYS.size || keys.some((key) => !THEME_KEYS.has(key))) {
    return { ok: false, code: "invalid-widget-theme" };
  }
  if (
    typeof value.appearance !== "string"
    || !APPEARANCES.has(value.appearance as WidgetAppearance)
    || typeof value.accent !== "string"
    || !ACCENTS.has(value.accent as WidgetAccent)
    || typeof value.density !== "string"
    || !DENSITIES.has(value.density as WidgetDensity)
    || typeof value.radiusPreset !== "string"
    || !RADII.has(value.radiusPreset as WidgetRadiusPreset)
    || typeof value.showTitle !== "boolean"
  ) {
    return { ok: false, code: "invalid-widget-theme" };
  }
  return {
    ok: true,
    value: {
      appearance: value.appearance as WidgetAppearance,
      accent: value.accent as WidgetAccent,
      density: value.density as WidgetDensity,
      radiusPreset: value.radiusPreset as WidgetRadiusPreset,
      showTitle: value.showTitle,
    },
  };
};

export const parseWidgetBrandingPreference = (
  value: unknown,
): WidgetParseResult<WidgetBrandingPreference, "invalid-widget-branding"> =>
  typeof value === "string" && BRANDING.has(value as WidgetBrandingPreference)
    ? { ok: true, value: value as WidgetBrandingPreference }
    : { ok: false, code: "invalid-widget-branding" };

export const isWidgetEventType = (value: unknown): value is WidgetEventType =>
  typeof value === "string" && EVENTS.has(value as WidgetEventType);
