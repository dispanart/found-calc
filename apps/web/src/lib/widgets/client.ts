import { isWidgetEventType, parseWidgetBrandingPreference, parseWidgetTheme, type WidgetAnalyticsLevel, type WidgetBrandingPreference, type WidgetEventType, type WidgetStatus, type WidgetTheme } from "./contracts";
import type { SupportedCalculatorId, WidgetDefaultConfiguration } from "./defaults";
import { isPublicWidgetKey } from "./identity";

export type WidgetLocaleClient = "id" | "en";

export interface WidgetClient {
  readonly id: string;
  readonly publicWidgetKey: string;
  readonly publicKeyVersion: number;
  readonly name: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly locale: WidgetLocaleClient;
  readonly status: WidgetStatus;
  readonly theme: WidgetTheme;
  readonly brandingPreference: WidgetBrandingPreference;
  readonly defaultInputConfiguration: WidgetDefaultConfiguration;
  readonly keyRotatedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WidgetDomainClient {
  readonly id: string;
  readonly hostname: string;
  readonly displayHostname: string;
  readonly status: "pending" | "active" | "disabled" | "revoked";
  readonly verifiedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WidgetBindingClient {
  readonly widgetId: string;
  readonly domainId: string;
  readonly priority: number | null;
  readonly createdAt: number;
}

export interface WidgetAnalyticsEventClient {
  readonly widgetId: string;
  readonly domainId: string;
  readonly calculatorId: string;
  readonly locale: WidgetLocaleClient;
  readonly eventType: WidgetEventType;
  readonly eventDay: string;
  readonly count: number;
  readonly lastOccurredAt: number;
}

export interface WidgetAnalyticsClient {
  readonly level: WidgetAnalyticsLevel;
  readonly days: 7 | 30;
  readonly events: readonly WidgetAnalyticsEventClient[];
}

export type WidgetVerificationClient =
  | { readonly method: "local_development" }
  | {
      readonly id: string;
      readonly method: "dns_txt";
      readonly recordName: string;
      readonly challengeToken: string;
      readonly expiresAt: number;
    };

export interface CreatedWidgetDomainClient {
  readonly domain: WidgetDomainClient;
  readonly verification: WidgetVerificationClient;
}

export class WidgetClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "WidgetClientError";
    this.code = code;
    this.status = status;
  }
}

const CALCULATORS = new Set<SupportedCalculatorId>([
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
  "quick.percentage",
  "quick.date-difference",
  "quick.length-conversion",
]);
const WIDGET_KEYS = [
  "id", "publicWidgetKey", "publicKeyVersion", "name", "calculatorId", "locale", "status", "theme",
  "brandingPreference", "defaultInputConfiguration", "keyRotatedAt", "createdAt", "updatedAt",
] as const;
const DOMAIN_KEYS = ["id", "hostname", "displayHostname", "status", "verifiedAt", "createdAt", "updatedAt"] as const;
const BINDING_KEYS = ["widgetId", "domainId", "priority", "createdAt"] as const;
const EVENT_KEYS = ["widgetId", "domainId", "calculatorId", "locale", "eventType", "eventDay", "count", "lastOccurredAt"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
};
const nonEmpty = (value: unknown, max = 256): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const timestamp = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const nullableTimestamp = (value: unknown): value is number | null => value === null || timestamp(value);

const parseDefaults = (value: unknown): WidgetDefaultConfiguration | null => {
  if (!isRecord(value) || Object.keys(value).length > 16) return null;
  const result: Record<string, string | readonly string[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(key)) return null;
    if (typeof entry === "string" && entry.length <= 256) {
      result[key] = entry;
      continue;
    }
    if (Array.isArray(entry) && entry.length <= 16 && entry.every((item) => typeof item === "string" && item.length <= 256)) {
      result[key] = entry as string[];
      continue;
    }
    return null;
  }
  return result;
};

const parseWidget = (value: unknown): WidgetClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, WIDGET_KEYS)) return null;
  const theme = parseWidgetTheme(value.theme);
  const branding = parseWidgetBrandingPreference(value.brandingPreference);
  const defaults = parseDefaults(value.defaultInputConfiguration);
  if (!nonEmpty(value.id, 128) || !isPublicWidgetKey(value.publicWidgetKey) || !Number.isSafeInteger(value.publicKeyVersion) || Number(value.publicKeyVersion) < 1) return null;
  if (!nonEmpty(value.name, 80) || typeof value.calculatorId !== "string" || !CALCULATORS.has(value.calculatorId as SupportedCalculatorId)) return null;
  if (value.locale !== "id" && value.locale !== "en") return null;
  if (value.status !== "active" && value.status !== "disabled" && value.status !== "revoked") return null;
  if (!theme.ok || !branding.ok || defaults === null || !nullableTimestamp(value.keyRotatedAt) || !timestamp(value.createdAt) || !timestamp(value.updatedAt)) return null;
  return {
    id: value.id,
    publicWidgetKey: value.publicWidgetKey,
    publicKeyVersion: Number(value.publicKeyVersion),
    name: value.name,
    calculatorId: value.calculatorId as SupportedCalculatorId,
    locale: value.locale,
    status: value.status,
    theme: theme.value,
    brandingPreference: branding.value,
    defaultInputConfiguration: defaults,
    keyRotatedAt: value.keyRotatedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const parseDomain = (value: unknown): WidgetDomainClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, DOMAIN_KEYS)) return null;
  if (!nonEmpty(value.id, 128) || !nonEmpty(value.hostname) || !nonEmpty(value.displayHostname)) return null;
  if (value.status !== "pending" && value.status !== "active" && value.status !== "disabled" && value.status !== "revoked") return null;
  if (!nullableTimestamp(value.verifiedAt) || !timestamp(value.createdAt) || !timestamp(value.updatedAt)) return null;
  return {
    id: value.id,
    hostname: value.hostname,
    displayHostname: value.displayHostname,
    status: value.status,
    verifiedAt: value.verifiedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const parseBinding = (value: unknown): WidgetBindingClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, BINDING_KEYS)) return null;
  if (!nonEmpty(value.widgetId, 128) || !nonEmpty(value.domainId, 128) || !timestamp(value.createdAt)) return null;
  if (value.priority !== null && (!Number.isSafeInteger(value.priority) || Number(value.priority) < 0)) return null;
  return { widgetId: value.widgetId, domainId: value.domainId, priority: value.priority as number | null, createdAt: value.createdAt };
};

export const parseWidgetsPayload = (value: unknown): readonly WidgetClient[] | null => {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.widgets)) return null;
  const widgets: WidgetClient[] = [];
  for (const candidate of value.widgets) { const parsed = parseWidget(candidate); if (!parsed) return null; widgets.push(parsed); }
  return widgets;
};

export const parseWidgetDomainsPayload = (value: unknown): readonly WidgetDomainClient[] | null => {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.domains)) return null;
  const domains: WidgetDomainClient[] = [];
  for (const candidate of value.domains) { const parsed = parseDomain(candidate); if (!parsed) return null; domains.push(parsed); }
  return domains;
};

export const parseWidgetDetailPayload = (value: unknown): { widget: WidgetClient; bindings: readonly WidgetBindingClient[] } | null => {
  if (!isRecord(value) || Object.keys(value).length !== 2 || !Array.isArray(value.bindings)) return null;
  const widget = parseWidget(value.widget);
  if (!widget) return null;
  const bindings: WidgetBindingClient[] = [];
  for (const candidate of value.bindings) { const parsed = parseBinding(candidate); if (!parsed) return null; bindings.push(parsed); }
  return { widget, bindings };
};

export const parseWidgetAnalyticsPayload = (value: unknown): WidgetAnalyticsClient | null => {
  if (!isRecord(value) || Object.keys(value).length !== 3 || !Array.isArray(value.events)) return null;
  if (value.level !== "operational" && value.level !== "standard" && value.level !== "advanced") return null;
  if (value.days !== 7 && value.days !== 30) return null;
  const events: WidgetAnalyticsEventClient[] = [];
  for (const candidate of value.events) {
    if (!isRecord(candidate) || !hasOnlyKeys(candidate, EVENT_KEYS)) return null;
    if (!nonEmpty(candidate.widgetId, 128) || !nonEmpty(candidate.domainId, 128) || !nonEmpty(candidate.calculatorId, 128)) return null;
    if (candidate.locale !== "id" && candidate.locale !== "en") return null;
    if (!isWidgetEventType(candidate.eventType) || typeof candidate.eventDay !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.eventDay)) return null;
    if (!Number.isSafeInteger(candidate.count) || Number(candidate.count) < 0 || !timestamp(candidate.lastOccurredAt)) return null;
    events.push({
      widgetId: candidate.widgetId,
      domainId: candidate.domainId,
      calculatorId: candidate.calculatorId,
      locale: candidate.locale,
      eventType: candidate.eventType,
      eventDay: candidate.eventDay,
      count: Number(candidate.count),
      lastOccurredAt: candidate.lastOccurredAt,
    });
  }
  return { level: value.level, days: value.days, events };
};

const parseErrorCode = async (response: Response): Promise<string> => {
  try {
    const body = await response.clone().json() as unknown;
    if (isRecord(body) && isRecord(body.error) && typeof body.error.code === "string") return body.error.code;
  } catch { /* normalized below */ }
  return "widget-request-failed";
};

const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const response = await fetch(path, { ...init, credentials: "include", cache: "no-store" });
  if (!response.ok) throw new WidgetClientError(await parseErrorCode(response), response.status);
  return response;
};
const requestJson = async (path: string, method: "POST" | "PATCH" | "PUT", value: unknown): Promise<Response> =>
  request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });

export const fetchWidgets = async (): Promise<readonly WidgetClient[]> => {
  const response = await request("/api/workspace/widgets");
  const parsed = parseWidgetsPayload(await response.json());
  if (!parsed) throw new WidgetClientError("invalid-widget-response", 502);
  return parsed;
};

export const fetchWidgetDomains = async (): Promise<readonly WidgetDomainClient[]> => {
  const response = await request("/api/workspace/widget-domains");
  const parsed = parseWidgetDomainsPayload(await response.json());
  if (!parsed) throw new WidgetClientError("invalid-widget-response", 502);
  return parsed;
};

export const fetchWidgetDetail = async (widgetId: string) => {
  const response = await request(`/api/workspace/widgets/${encodeURIComponent(widgetId)}`);
  const parsed = parseWidgetDetailPayload(await response.json());
  if (!parsed) throw new WidgetClientError("invalid-widget-response", 502);
  return parsed;
};

export const fetchWidgetAnalytics = async (widgetId: string, days: 7 | 30 = 7): Promise<WidgetAnalyticsClient> => {
  const response = await request(`/api/workspace/widgets/${encodeURIComponent(widgetId)}/analytics?days=${days}`);
  const parsed = parseWidgetAnalyticsPayload(await response.json());
  if (!parsed) throw new WidgetClientError("invalid-widget-response", 502);
  return parsed;
};

export const createWidgetDomain = async (origin: string): Promise<CreatedWidgetDomainClient> => {
  const response = await requestJson("/api/workspace/widget-domains", "POST", { origin });
  const body = await response.json() as unknown;
  if (!isRecord(body) || Object.keys(body).length !== 2) throw new WidgetClientError("invalid-widget-response", 502);
  const domain = parseDomain(body.domain);
  if (!domain || !isRecord(body.verification)) throw new WidgetClientError("invalid-widget-response", 502);
  const verification = body.verification;
  if (verification.method === "local_development" && Object.keys(verification).length === 1) return { domain, verification: { method: "local_development" } };
  if (
    Object.keys(verification).length === 5
    && verification.method === "dns_txt"
    && nonEmpty(verification.id, 128)
    && nonEmpty(verification.recordName, 512)
    && nonEmpty(verification.challengeToken, 256)
    && timestamp(verification.expiresAt)
  ) {
    return { domain, verification: { id: verification.id, method: "dns_txt", recordName: verification.recordName, challengeToken: verification.challengeToken, expiresAt: verification.expiresAt } };
  }
  throw new WidgetClientError("invalid-widget-response", 502);
};

export const verifyWidgetDomain = async (domainId: string): Promise<WidgetDomainClient> => {
  const response = await requestJson(`/api/workspace/widget-domains/${encodeURIComponent(domainId)}/verify`, "POST", {});
  const body = await response.json() as unknown;
  if (!isRecord(body) || Object.keys(body).length !== 2 || body.verified !== true) throw new WidgetClientError("invalid-widget-response", 502);
  const domain = parseDomain(body.domain);
  if (!domain) throw new WidgetClientError("invalid-widget-response", 502);
  return domain;
};

export interface CreateWidgetInput {
  readonly name: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly locale: WidgetLocaleClient;
  readonly domainIds: readonly string[];
  readonly defaults: WidgetDefaultConfiguration;
  readonly theme?: WidgetTheme;
  readonly brandingPreference?: WidgetBrandingPreference;
}

export const createWidget = async (input: CreateWidgetInput): Promise<WidgetClient> => {
  const response = await requestJson("/api/workspace/widgets", "POST", input);
  const body = await response.json() as unknown;
  if (!isRecord(body) || !Array.isArray(body.domainIds)) throw new WidgetClientError("invalid-widget-response", 502);
  const widget = parseWidget(body.widget);
  if (!widget || body.domainIds.some((id) => typeof id !== "string")) throw new WidgetClientError("invalid-widget-response", 502);
  return widget;
};

export const patchWidget = async (widgetId: string, patch: Record<string, unknown>): Promise<WidgetClient> => {
  const response = await requestJson(`/api/workspace/widgets/${encodeURIComponent(widgetId)}`, "PATCH", patch);
  const body = await response.json() as unknown;
  if (!isRecord(body) || Object.keys(body).length !== 1) throw new WidgetClientError("invalid-widget-response", 502);
  const widget = parseWidget(body.widget);
  if (!widget) throw new WidgetClientError("invalid-widget-response", 502);
  return widget;
};

export const updateWidgetDomains = async (widgetId: string, domainIds: readonly string[]): Promise<readonly WidgetBindingClient[]> => {
  const response = await requestJson(`/api/workspace/widgets/${encodeURIComponent(widgetId)}/domains`, "PUT", { domainIds });
  const body = await response.json() as unknown;
  if (!isRecord(body) || Object.keys(body).length !== 1 || !Array.isArray(body.bindings)) throw new WidgetClientError("invalid-widget-response", 502);
  const bindings: WidgetBindingClient[] = [];
  for (const candidate of body.bindings) { const parsed = parseBinding(candidate); if (!parsed) throw new WidgetClientError("invalid-widget-response", 502); bindings.push(parsed); }
  return bindings;
};

export const rotateWidgetPublicKey = async (widgetId: string): Promise<WidgetClient> => {
  const response = await requestJson(`/api/workspace/widgets/${encodeURIComponent(widgetId)}/rotate-key`, "POST", {});
  const body = await response.json() as unknown;
  if (!isRecord(body) || Object.keys(body).length !== 1) throw new WidgetClientError("invalid-widget-response", 502);
  const widget = parseWidget(body.widget);
  if (!widget) throw new WidgetClientError("invalid-widget-response", 502);
  return widget;
};
