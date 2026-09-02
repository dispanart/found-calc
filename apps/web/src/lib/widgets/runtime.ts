import type { Locale } from "@/i18n/locales";
import type { CommercialAccessAuthorizer } from "@/lib/billing/capabilities";

import { selectEffectiveWidgetDomains, widgetCapabilitiesForAccess } from "./capabilities";
import type { WidgetAnalyticsLevel, WidgetTheme } from "./contracts";
import { normalizeWidgetOrigin } from "./domain";
import type { createWidgetDomainRepository } from "./domain-repository";
import { parseWidgetDefaults, type SupportedCalculatorId, type WidgetDefaultConfiguration } from "./defaults";
import type { createWidgetRepository } from "./widget-repository";

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true,
};

export interface ResolvedWidgetRuntime {
  readonly widgetId: string;
  readonly publicWidgetKey: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly locale: Locale;
  readonly parentOrigin: string;
  readonly domainId: string;
  readonly theme: WidgetTheme;
  readonly branding: "foundcalc" | "hidden";
  readonly defaults: WidgetDefaultConfiguration;
  readonly analyticsLevel: WidgetAnalyticsLevel;
}

export interface WidgetRuntimeServices {
  readonly widgets: Pick<ReturnType<typeof createWidgetRepository>, "getByPublicKey" | "listBindings"> & Partial<Pick<ReturnType<typeof createWidgetRepository>, "getForOwner">>;
  readonly domains: Pick<ReturnType<typeof createWidgetDomainRepository>, "listForOwner">;
  readonly access: CommercialAccessAuthorizer;
  readonly mode?: "production" | "development";
  readonly localPorts?: readonly number[];
}

export type ResolvePublicWidgetRuntimeResult =
  | { readonly ok: true; readonly value: ResolvedWidgetRuntime }
  | { readonly ok: false; readonly code: "unavailable" };

const unavailable = (): ResolvePublicWidgetRuntimeResult => ({ ok: false, code: "unavailable" });
const SUPPORTED_CALCULATOR_IDS = new Set<SupportedCalculatorId>([
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
  "quick.percentage",
  "quick.date-difference",
  "quick.length-conversion",
]);
const supportedCalculatorId = (value: string): SupportedCalculatorId | null => SUPPORTED_CALCULATOR_IDS.has(value as SupportedCalculatorId) ? value as SupportedCalculatorId : null;

const effectivePresentation = async (
  widget: Awaited<ReturnType<NonNullable<WidgetRuntimeServices["widgets"]["getForOwner"]>>>,
  now: Date,
  services: WidgetRuntimeServices,
) => {
  if (!widget) return null;
  const calculatorId = supportedCalculatorId(widget.calculatorId);
  if (!calculatorId) return null;
  const defaults = parseWidgetDefaults(calculatorId, widget.defaultInputConfiguration);
  if (!defaults.ok) return null;
  if (!Number.isFinite(now.valueOf())) return null;
  const access = await services.access.getAccess(widget.ownerUserId, now);
  const capabilities = widgetCapabilitiesForAccess(access);
  if (!capabilities.runtimeAvailable) return null;
  return {
    calculatorId,
    defaults: defaults.value,
    theme: capabilities.canCustomizeTheme ? widget.theme : DEFAULT_WIDGET_THEME,
    branding: capabilities.canRemoveBranding ? widget.brandingPreference : "foundcalc" as const,
    analyticsLevel: capabilities.analyticsLevel,
  };
};

export const resolveWidgetPreviewRuntime = async (
  input: { readonly widgetId: string; readonly ownerUserId: string; readonly now?: Date },
  services: WidgetRuntimeServices,
): Promise<ResolvedWidgetRuntime | null> => {
  try {
    if (!services.widgets.getForOwner) return null;
    const widget = await services.widgets.getForOwner(input.ownerUserId, input.widgetId);
    if (!widget || widget.status === "revoked") return null;
    const effective = await effectivePresentation(widget, input.now ?? new Date(), services);
    if (!effective) return null;
    return {
      widgetId: widget.id,
      publicWidgetKey: widget.publicWidgetKey,
      calculatorId: effective.calculatorId,
      locale: widget.locale,
      parentOrigin: "",
      domainId: "preview",
      theme: effective.theme,
      branding: effective.branding,
      defaults: effective.defaults,
      analyticsLevel: effective.analyticsLevel,
    };
  } catch {
    return null;
  }
};

export const resolvePublicWidgetRuntime = async (
  input: { readonly publicWidgetKey: string; readonly parentOrigin: string; readonly now?: Date },
  services: WidgetRuntimeServices,
): Promise<ResolvePublicWidgetRuntimeResult> => {
  try {
    const normalizedParent = normalizeWidgetOrigin(input.parentOrigin, {
      mode: services.mode ?? "production",
      localPorts: services.localPorts ?? [],
    });
    if (!normalizedParent.ok) return unavailable();
    const widget = await services.widgets.getByPublicKey(input.publicWidgetKey);
    if (!widget || widget.status !== "active") return unavailable();
    const calculatorId = supportedCalculatorId(widget.calculatorId);
    if (!calculatorId) return unavailable();
    const defaults = parseWidgetDefaults(calculatorId, widget.defaultInputConfiguration);
    if (!defaults.ok) return unavailable();
    const now = input.now ?? new Date();
    if (!Number.isFinite(now.valueOf())) return unavailable();
    const [access, bindings, domains] = await Promise.all([
      services.access.getAccess(widget.ownerUserId, now), services.widgets.listBindings(widget.id), services.domains.listForOwner(widget.ownerUserId),
    ]);
    const capabilities = widgetCapabilitiesForAccess(access);
    if (!capabilities.runtimeAvailable) return unavailable();
    const domainById = new Map(domains.map((domain) => [domain.id, domain] as const));
    const candidates = bindings.flatMap((binding) => {
      const domain = domainById.get(binding.domainId);
      if (!domain || domain.deletedAt !== null) return [];
      return [{ domainId: domain.id, status: domain.status, verifiedAt: domain.verifiedAt, priority: binding.priority }];
    });
    const effectiveDomainIds = new Set(selectEffectiveWidgetDomains(candidates, capabilities.maxEffectiveDomains));
    const matchedDomain = domains.find((domain) =>
      effectiveDomainIds.has(domain.id)
      && domain.status === "active"
      && domain.verifiedAt !== null
      && domain.deletedAt === null
      && normalizedParent.value.pairKey === domain.pairKey);
    if (!matchedDomain) return unavailable();
    return { ok: true, value: {
      widgetId: widget.id, publicWidgetKey: widget.publicWidgetKey, calculatorId, locale: widget.locale,
      parentOrigin: normalizedParent.value.origin, domainId: matchedDomain.id,
      theme: capabilities.canCustomizeTheme ? widget.theme : DEFAULT_WIDGET_THEME,
      branding: capabilities.canRemoveBranding ? widget.brandingPreference : "foundcalc",
      defaults: defaults.value, analyticsLevel: capabilities.analyticsLevel,
    } };
  } catch {
    return unavailable();
  }
};
