import type { CommercialAccessAuthorizer } from "@/lib/billing/capabilities";

import type { createWidgetAnalyticsRepository } from "./analytics-repository";
import { isWidgetEventType, type WidgetEventType } from "./contracts";
import type { createWidgetDomainRepository } from "./domain-repository";
import { isPublicWidgetKey } from "./identity";
import { resolvePublicWidgetRuntime } from "./runtime";
import type { createWidgetRepository } from "./widget-repository";

export interface WidgetAnalyticsEvent {
  readonly schemaVersion: 1;
  readonly eventType: WidgetEventType;
  readonly widgetKey: string;
  readonly parentOrigin: string;
}

export interface WidgetAnalyticsServices {
  readonly widgets: Pick<ReturnType<typeof createWidgetRepository>, "getByPublicKey" | "listBindings">;
  readonly domains: Pick<ReturnType<typeof createWidgetDomainRepository>, "listForOwner">;
  readonly access: CommercialAccessAuthorizer;
  readonly analytics: Pick<ReturnType<typeof createWidgetAnalyticsRepository>, "increment">;
  readonly now: () => number;
}

export interface WidgetAnalyticsReadServices {
  readonly analytics: Pick<ReturnType<typeof createWidgetAnalyticsRepository>, "listForWidget" | "deleteBefore">;
  readonly now: () => number;
}

const MAX_ANALYTICS_BODY_BYTES = 1_024;
const DAY_MS = 86_400_000;
const RETENTION_DAYS = 90;
const ANALYTICS_KEYS = new Set(["schemaVersion", "eventType", "widgetKey", "parentOrigin"]);
const noStore = { "Cache-Control": "no-store" } as const;
const noContent = () => new Response(null, { status: 204, headers: noStore });
const jsonError = (code: string, status: number) =>
  Response.json({ error: { code } }, { status, headers: noStore });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseExactOrigin = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin === value ? value : null;
  } catch {
    return null;
  }
};

export const parseWidgetAnalyticsEvent = (value: unknown): WidgetAnalyticsEvent | null => {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== ANALYTICS_KEYS.size || keys.some((key) => !ANALYTICS_KEYS.has(key))) return null;
  if (value.schemaVersion !== 1 || !isWidgetEventType(value.eventType) || !isPublicWidgetKey(value.widgetKey)) return null;
  const parentOrigin = parseExactOrigin(value.parentOrigin);
  if (!parentOrigin) return null;
  return {
    schemaVersion: 1,
    eventType: value.eventType,
    widgetKey: value.widgetKey,
    parentOrigin,
  };
};

const readBoundedJson = async (request: Request): Promise<unknown | null | "too-large"> => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_ANALYTICS_BODY_BYTES) return "too-large";
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_ANALYTICS_BODY_BYTES) return "too-large";
  try { return JSON.parse(text) as unknown; }
  catch { return null; }
};

const utcDay = (timestamp: number): string | null => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.valueOf())) return null;
  return date.toISOString().slice(0, 10);
};

export const handleWidgetAnalyticsEventRequest = async (
  request: Request,
  publicWidgetKey: string,
  services: WidgetAnalyticsServices,
): Promise<Response> => {
  if (request.method !== "POST") return jsonError("method-not-allowed", 405);
  const value = await readBoundedJson(request);
  if (value === "too-large") return jsonError("payload-too-large", 413);
  const event = parseWidgetAnalyticsEvent(value);
  if (!event || event.widgetKey !== publicWidgetKey) return jsonError("invalid-widget-event", 400);

  const occurredAt = services.now();
  const eventDay = utcDay(occurredAt);
  if (!eventDay) return jsonError("service-unavailable", 503);
  const runtime = await resolvePublicWidgetRuntime(
    { publicWidgetKey, parentOrigin: event.parentOrigin, now: new Date(occurredAt) },
    { widgets: services.widgets, domains: services.domains, access: services.access },
  );
  if (!runtime.ok) return jsonError("unavailable", 404);

  try {
    await services.analytics.increment({
      widgetId: runtime.value.widgetId,
      domainId: runtime.value.domainId,
      calculatorId: runtime.value.calculatorId,
      locale: runtime.value.locale,
      eventType: event.eventType,
      eventDay,
    }, occurredAt);
  } catch {
    console.warn("Widget analytics aggregate write failed", { eventType: event.eventType });
  }
  return noContent();
};

export const cleanupWidgetAnalyticsRetention = async (
  services: Pick<WidgetAnalyticsReadServices, "analytics" | "now">,
): Promise<void> => {
  const now = services.now();
  if (!Number.isFinite(now)) return;
  const cutoffDay = utcDay(now - RETENTION_DAYS * DAY_MS);
  if (cutoffDay) await services.analytics.deleteBefore(cutoffDay);
};

export const readWidgetAnalyticsWithRetention = async (
  widgetId: string,
  fromDay: string,
  services: WidgetAnalyticsReadServices,
) => {
  await cleanupWidgetAnalyticsRetention(services);
  return services.analytics.listForWidget(widgetId, fromDay);
};
