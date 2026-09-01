import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { promises as dns } from "node:dns";

import { getFoundCalcAuth } from "@/lib/auth/server";
import { createCommercialAccessAuthorizer } from "@/lib/billing/capabilities";

import { createWidgetAnalyticsRepository } from "./analytics-repository";
import { createWidgetDomainRepository } from "./domain-repository";
import { createWidgetRepository } from "./widget-repository";

const database = () => (env as unknown as { DB: D1Database }).DB;
const localPorts = (): readonly number[] => (process.env.FOUNDCALC_WIDGET_LOCAL_PORTS ?? "")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isSafeInteger(value) && value > 0 && value <= 65_535);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isConfiguredLocalWidgetDevelopment = (ports: readonly number[]): boolean => {
  if (ports.length === 0) return false;
  const configuredEmbedOrigin = process.env.FOUNDCALC_EMBED_ORIGIN;
  if (!configuredEmbedOrigin) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(configuredEmbedOrigin).hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const getWidgetRouteServices = () => {
  const DB = database();
  const configuredLocalPorts = localPorts();
  return {
    auth: getFoundCalcAuth(),
    access: createCommercialAccessAuthorizer(DB),
    domains: createWidgetDomainRepository(DB),
    widgets: createWidgetRepository(DB),
    analytics: createWidgetAnalyticsRepository(DB),
    resolveTxt: (hostname: string) => dns.resolveTxt(hostname),
    now: () => Date.now(),
    mode: isConfiguredLocalWidgetDevelopment(configuredLocalPorts) ? "development" as const : "production" as const,
    localPorts: configuredLocalPorts,
  };
};

export const widgetRouteFailure = () =>
  Response.json(
    { error: { code: "service-unavailable" } },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
