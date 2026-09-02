import type { FoundCalcAuth } from "@/lib/auth/server";
import type { CommercialAccessAuthorizer } from "@/lib/billing/capabilities";
import { MAX_WORKSPACE_BODY_BYTES } from "@/lib/workspace/contracts";

import type { ReturnTypeOfWidgetAnalyticsRepository } from "./http-types";
import { widgetCapabilitiesForAccess } from "./capabilities";
import {
  parseWidgetBrandingPreference,
  parseWidgetTheme,
  type WidgetBrandingPreference,
  type WidgetTheme,
} from "./contracts";
import { normalizeWidgetOrigin } from "./domain";
import type { createWidgetDomainRepository } from "./domain-repository";
import { parseWidgetDefaults, type SupportedCalculatorId } from "./defaults";
import { generatePublicWidgetKey, generateVerificationChallenge } from "./identity";
import type { createWidgetRepository, StoredWidget, WidgetLocale } from "./widget-repository";
import {
  createVerificationExpiry,
  isVerificationCheckAllowed,
  isVerificationExpired,
  verifyDnsTxtChallenge,
  type ResolveTxt,
} from "./verification";

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  appearance: "system",
  accent: "brand",
  density: "comfortable",
  radiusPreset: "standard",
  showTitle: true,
};

const SUPPORTED_CALCULATORS = new Set<SupportedCalculatorId>([
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
  "quick.percentage",
  "quick.date-difference",
  "quick.length-conversion",
]);
const WIDGET_NAME_MAX_LENGTH = 80;

export interface WidgetHttpServices {
  readonly auth: FoundCalcAuth;
  readonly access: CommercialAccessAuthorizer;
  readonly domains: ReturnType<typeof createWidgetDomainRepository>;
  readonly widgets: ReturnType<typeof createWidgetRepository>;
  readonly analytics: ReturnTypeOfWidgetAnalyticsRepository;
  readonly resolveTxt: ResolveTxt;
  readonly now: () => number;
  readonly mode: "production" | "development";
  readonly localPorts: readonly number[];
}

const noStoreHeaders = { "Cache-Control": "no-store" } as const;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreHeaders });
const error = (code: string, status: number) => json({ error: { code } }, status);
const noContent = () => new Response(null, { status: 204, headers: noStoreHeaders });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const authenticate = async (request: Request, services: WidgetHttpServices) => {
  const session = await services.auth.api.getSession({ headers: request.headers });
  return session?.user.id
    ? { ok: true as const, userId: session.user.id }
    : { ok: false as const, response: error("authentication-required", 401) };
};

const readJson = async (request: Request) => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_WORKSPACE_BODY_BYTES) {
    return { ok: false as const, response: error("payload-too-large", 413) };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_WORKSPACE_BODY_BYTES) {
    return { ok: false as const, response: error("payload-too-large", 413) };
  }
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, response: error("invalid-json", 400) };
  }
};

const widgetResponse = (widget: StoredWidget) => ({
  id: widget.id,
  publicWidgetKey: widget.publicWidgetKey,
  publicKeyVersion: widget.publicKeyVersion,
  name: widget.name,
  calculatorId: widget.calculatorId,
  locale: widget.locale,
  status: widget.status,
  theme: widget.theme,
  brandingPreference: widget.brandingPreference,
  defaultInputConfiguration: widget.defaultInputConfiguration,
  keyRotatedAt: widget.keyRotatedAt,
  createdAt: widget.createdAt,
  updatedAt: widget.updatedAt,
});

const domainResponse = (domain: Awaited<ReturnType<WidgetHttpServices["domains"]["getForOwner"]>>) => domain && ({
  id: domain.id,
  hostname: domain.normalizedHostname,
  displayHostname: domain.displayHostname,
  status: domain.status,
  verifiedAt: domain.verifiedAt,
  createdAt: domain.createdAt,
  updatedAt: domain.updatedAt,
});

const safeThemeFor = (submitted: unknown, canCustomizeTheme: boolean) => {
  if (!canCustomizeTheme) return { ok: true as const, value: DEFAULT_WIDGET_THEME };
  if (submitted === undefined) return { ok: true as const, value: DEFAULT_WIDGET_THEME };
  return parseWidgetTheme(submitted);
};

const safeBrandingFor = (submitted: unknown, canRemoveBranding: boolean) => {
  if (!canRemoveBranding) return { ok: true as const, value: "foundcalc" as WidgetBrandingPreference };
  if (submitted === undefined) return { ok: true as const, value: "foundcalc" as WidgetBrandingPreference };
  return parseWidgetBrandingPreference(submitted);
};

const parseWidgetName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= WIDGET_NAME_MAX_LENGTH ? trimmed : null;
};
const parseLocale = (value: unknown): WidgetLocale | null => value === "id" || value === "en" ? value : null;
const parseCalculatorId = (value: unknown): SupportedCalculatorId | null =>
  typeof value === "string" && SUPPORTED_CALCULATORS.has(value as SupportedCalculatorId)
    ? value as SupportedCalculatorId
    : null;

const parseDomainIds = (value: unknown): readonly string[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) return null;
  const ids = value as string[];
  return new Set(ids).size === ids.length ? ids : null;
};

const validateBoundDomains = async (
  userId: string,
  domainIds: readonly string[],
  maxDomains: number,
  services: WidgetHttpServices,
) => {
  if (domainIds.length > maxDomains) return { ok: false as const, response: error("widget-domain-limit-reached", 403) };
  const domains = await Promise.all(domainIds.map((id) => services.domains.getForOwner(userId, id)));
  if (domains.some((domain) => !domain || domain.status !== "active" || domain.verifiedAt === null)) {
    return { ok: false as const, response: error("widget-domain-not-available", 400) };
  }
  return { ok: true as const };
};

export const handleWidgetDomainsRequest = async (
  request: Request,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    if (request.method === "GET") {
      return json({ domains: (await services.domains.listForOwner(auth.userId)).map(domainResponse) });
    }
    if (request.method !== "POST") return error("method-not-allowed", 405);

    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value) || typeof body.value.origin !== "string") return error("invalid-widget-domain", 400);
    const normalized = normalizeWidgetOrigin(body.value.origin, { mode: services.mode, localPorts: services.localPorts });
    if (!normalized.ok) return error(normalized.code, 400);

    const existing = await services.domains.listForOwner(auth.userId);
    if (existing.some((domain) => domain.pairKey === normalized.value.pairKey)) {
      return error("widget-domain-already-registered", 409);
    }
    const access = await services.access.getAccess(auth.userId, new Date(services.now()));
    const capabilities = widgetCapabilitiesForAccess(access);
    if (existing.length >= capabilities.maxEffectiveDomains) return error("widget-domain-limit-reached", 403);

    const now = services.now();
    const domain = await services.domains.create(auth.userId, normalized.value, now);
    if (normalized.value.isLocalDevelopment) {
      const verification = await services.domains.createVerification({
        domainId: domain.id,
        method: "local_development",
        challengeToken: null,
        expiresAt: null,
        createdAt: now,
      });
      await services.domains.completeVerification(verification.id, domain.id, now);
      const active = await services.domains.getForOwner(auth.userId, domain.id);
      return json({ domain: domainResponse(active), verification: { method: "local_development" } }, 201);
    }

    const challengeToken = generateVerificationChallenge();
    const verification = await services.domains.createVerification({
      domainId: domain.id,
      method: "dns_txt",
      challengeToken,
      expiresAt: createVerificationExpiry(now),
      createdAt: now,
    });
    return json({
      domain: domainResponse(domain),
      verification: {
        id: verification.id,
        method: "dns_txt",
        recordName: `_foundcalc-verification.${domain.normalizedHostname}`,
        challengeToken,
        expiresAt: verification.expiresAt,
      },
    }, 201);
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetDomainRequest = async (
  request: Request,
  domainId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const domain = await services.domains.getForOwner(auth.userId, domainId);
    if (!domain) return error("widget-domain-not-found", 404);
    if (request.method === "DELETE") {
      return await services.domains.softDelete(auth.userId, domainId, services.now())
        ? noContent()
        : error("widget-domain-not-found", 404);
    }
    if (request.method !== "PATCH") return error("method-not-allowed", 405);
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value) || (body.value.status !== "active" && body.value.status !== "disabled")) {
      return error("invalid-widget-domain", 400);
    }
    if (body.value.status === "active" && domain.verifiedAt === null) return error("widget-domain-not-verified", 409);
    const updated = await services.domains.setStatus(auth.userId, domainId, body.value.status, services.now());
    return updated ? json({ domain: domainResponse(updated) }) : error("widget-domain-not-found", 404);
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetDomainVerifyRequest = async (
  request: Request,
  domainId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    if (request.method !== "POST") return error("method-not-allowed", 405);
    const domain = await services.domains.getForOwner(auth.userId, domainId);
    if (!domain) return error("widget-domain-not-found", 404);
    const verification = await services.domains.getPendingVerification(domainId);
    if (!verification || verification.method !== "dns_txt" || !verification.challengeToken || verification.expiresAt === null) {
      return error("verification-not-pending", 409);
    }
    const now = services.now();
    if (isVerificationExpired(verification.expiresAt, now)) return error("verification-challenge-expired", 410);
    if (!isVerificationCheckAllowed(verification.lastCheckedAt, now)) return error("verification-check-too-soon", 429);

    await services.domains.recordVerificationCheck(verification.id, now);
    const result = await verifyDnsTxtChallenge({
      hostname: domain.normalizedHostname,
      challengeToken: verification.challengeToken,
      resolveTxt: services.resolveTxt,
    });
    if (!result.ok) return error("dns-unavailable", 503);
    if (!result.verified) return error(result.code === "record-not-found" ? "verification-record-not-found" : "verification-token-not-found", 409);

    await services.domains.completeVerification(verification.id, domainId, now);
    const updated = await services.domains.getForOwner(auth.userId, domainId);
    return json({ domain: domainResponse(updated), verified: true });
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetsRequest = async (
  request: Request,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    if (request.method === "GET") {
      return json({ widgets: (await services.widgets.listForOwner(auth.userId)).map(widgetResponse) });
    }
    if (request.method !== "POST") return error("method-not-allowed", 405);
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return error("invalid-widget", 400);

    const name = parseWidgetName(body.value.name);
    const calculatorId = parseCalculatorId(body.value.calculatorId);
    const locale = parseLocale(body.value.locale);
    const domainIds = parseDomainIds(body.value.domainIds);
    if (!name || !calculatorId || !locale || domainIds === null) return error("invalid-widget", 400);

    const access = await services.access.getAccess(auth.userId, new Date(services.now()));
    const capabilities = widgetCapabilitiesForAccess(access);
    const theme = safeThemeFor(body.value.theme, capabilities.canCustomizeTheme);
    if (!theme.ok) return error(theme.code, 400);
    const branding = safeBrandingFor(body.value.brandingPreference, capabilities.canRemoveBranding);
    if (!branding.ok) return error(branding.code, 400);
    const defaults = parseWidgetDefaults(calculatorId, body.value.defaults ?? {});
    if (!defaults.ok) return error(defaults.code, 400);
    const bound = await validateBoundDomains(auth.userId, domainIds, capabilities.maxEffectiveDomains, services);
    if (!bound.ok) return bound.response;

    const now = services.now();
    const widget = await services.widgets.create({
      ownerUserId: auth.userId,
      publicWidgetKey: generatePublicWidgetKey(),
      name,
      calculatorId,
      locale,
      status: "active",
      theme: theme.value,
      brandingPreference: branding.value,
      defaultInputConfiguration: defaults.value,
      createdAt: now,
    });
    await Promise.all(domainIds.map((domainId, index) => services.widgets.bindDomain(auth.userId, widget.id, domainId, index)));
    return json({ widget: widgetResponse(widget), domainIds }, 201);
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetRequest = async (
  request: Request,
  widgetId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const current = await services.widgets.getForOwner(auth.userId, widgetId);
    if (!current) return error("widget-not-found", 404);
    if (request.method === "GET") {
      return json({ widget: widgetResponse(current), bindings: await services.widgets.listBindings(widgetId) });
    }
    if (request.method === "DELETE") {
      const revoked = await services.widgets.update({ ownerUserId: auth.userId, widgetId, status: "revoked", updatedAt: services.now() });
      return revoked ? noContent() : error("widget-not-found", 404);
    }
    if (request.method !== "PATCH") return error("method-not-allowed", 405);
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return error("invalid-widget", 400);

    const access = await services.access.getAccess(auth.userId, new Date(services.now()));
    const capabilities = widgetCapabilitiesForAccess(access);
    const update: Parameters<WidgetHttpServices["widgets"]["update"]>[0] = {
      ownerUserId: auth.userId,
      widgetId,
      updatedAt: services.now(),
    };
    if (body.value.name !== undefined) {
      const name = parseWidgetName(body.value.name);
      if (!name) return error("invalid-widget", 400);
      Object.assign(update, { name });
    }
    if (body.value.locale !== undefined) {
      const locale = parseLocale(body.value.locale);
      if (!locale) return error("invalid-widget", 400);
      Object.assign(update, { locale });
    }
    if (body.value.status !== undefined) {
      if (body.value.status !== "active" && body.value.status !== "disabled") return error("invalid-widget", 400);
      Object.assign(update, { status: body.value.status });
    }
    if (body.value.theme !== undefined) {
      const theme = safeThemeFor(body.value.theme, capabilities.canCustomizeTheme);
      if (!theme.ok) return error(theme.code, 400);
      Object.assign(update, { theme: theme.value });
    }
    if (body.value.brandingPreference !== undefined) {
      const branding = safeBrandingFor(body.value.brandingPreference, capabilities.canRemoveBranding);
      if (!branding.ok) return error(branding.code, 400);
      Object.assign(update, { brandingPreference: branding.value });
    }
    if (body.value.defaults !== undefined) {
      const calculatorId = parseCalculatorId(current.calculatorId);
      if (!calculatorId) return error("stored-widget-invalid", 503);
      const defaults = parseWidgetDefaults(calculatorId, body.value.defaults);
      if (!defaults.ok) return error(defaults.code, 400);
      Object.assign(update, { defaultInputConfiguration: defaults.value });
    }
    const updated = await services.widgets.update(update);
    return updated ? json({ widget: widgetResponse(updated) }) : error("widget-not-found", 404);
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetDomainsBindingRequest = async (
  request: Request,
  widgetId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const widget = await services.widgets.getForOwner(auth.userId, widgetId);
    if (!widget) return error("widget-not-found", 404);
    if (request.method === "GET") return json({ bindings: await services.widgets.listBindings(widgetId) });
    if (request.method !== "PUT") return error("method-not-allowed", 405);
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return error("invalid-widget-domains", 400);
    const domainIds = parseDomainIds(body.value.domainIds);
    if (domainIds === null) return error("invalid-widget-domains", 400);
    const access = await services.access.getAccess(auth.userId, new Date(services.now()));
    const capabilities = widgetCapabilitiesForAccess(access);
    const valid = await validateBoundDomains(auth.userId, domainIds, capabilities.maxEffectiveDomains, services);
    if (!valid.ok) return valid.response;

    const existing = await services.widgets.listBindings(widgetId);
    await Promise.all(existing.filter((binding) => !domainIds.includes(binding.domainId)).map((binding) =>
      services.widgets.unbindDomain(auth.userId, widgetId, binding.domainId)));
    await Promise.all(domainIds.map((domainId, index) => services.widgets.bindDomain(auth.userId, widgetId, domainId, index)));
    return json({ bindings: await services.widgets.listBindings(widgetId) });
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetRotateKeyRequest = async (
  request: Request,
  widgetId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    if (request.method !== "POST") return error("method-not-allowed", 405);
    const rotated = await services.widgets.rotatePublicKey(auth.userId, widgetId, generatePublicWidgetKey(), services.now());
    return rotated ? json({ widget: widgetResponse(rotated) }) : error("widget-not-found", 404);
  } catch {
    return error("service-unavailable", 503);
  }
};

export const handleWidgetAnalyticsRequest = async (
  request: Request,
  widgetId: string,
  services: WidgetHttpServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    if (request.method !== "GET") return error("method-not-allowed", 405);
    const widget = await services.widgets.getForOwner(auth.userId, widgetId);
    if (!widget) return error("widget-not-found", 404);
    const access = await services.access.getAccess(auth.userId, new Date(services.now()));
    const capabilities = widgetCapabilitiesForAccess(access);
    const url = new URL(request.url);
    const requestedDays = Number(url.searchParams.get("days") ?? "7");
    const maxDays = capabilities.analyticsLevel === "advanced" ? 30 : 7;
    const days = requestedDays === 30 && maxDays === 30 ? 30 : 7;
    const cutoff = new Date(services.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    return json({ level: capabilities.analyticsLevel, days, events: await services.analytics.listForWidget(widgetId, cutoff) });
  } catch {
    return error("service-unavailable", 503);
  }
};
