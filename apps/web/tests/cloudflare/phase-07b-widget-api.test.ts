import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveEffectiveCommercialAccess } from "@/lib/billing/entitlements";
import { createWidgetAnalyticsRepository } from "@/lib/widgets/analytics-repository";
import { createWidgetDomainRepository } from "@/lib/widgets/domain-repository";
import {
  handleWidgetDomainVerifyRequest,
  handleWidgetDomainsRequest,
  handleWidgetsRequest,
} from "@/lib/widgets/http";
import { createWidgetRepository } from "@/lib/widgets/widget-repository";
import { WIDGET_VERIFICATION_PREFIX } from "@/lib/widgets/verification";
import { resetPhase07bDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const now = 1_800_000_000_000;
const friendsAccess = resolveEffectiveCommercialAccess({
  paidTier: null,
  subscriptionStatus: null,
  paidThroughAt: null,
  trial: null,
  now,
});

const insertUser = async (id: string) => {
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
  ).bind(id, id, `${id}@phase07b.test`).run();
};

const services = (resolveTxt = vi.fn(async () => [] as readonly (readonly string[])[])) => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "widget-owner" } })) } },
  access: { getAccess: vi.fn(async () => friendsAccess) },
  domains: createWidgetDomainRepository(env.DB),
  widgets: createWidgetRepository(env.DB),
  analytics: createWidgetAnalyticsRepository(env.DB),
  resolveTxt,
  now: () => now,
  mode: "production" as const,
  localPorts: [] as readonly number[],
});

beforeEach(async () => {
  await resetPhase07bDatabase();
  await insertUser("widget-owner");
});

describe("Phase 07B widget management API with real D1", () => {
  it("creates a DNS challenge, verifies it exactly, and enforces Friends domain capacity", async () => {
    const createServices = services();
    const created = await handleWidgetDomainsRequest(new Request("https://foundcalc.test/api/workspace/widget-domains", {
      method: "POST",
      body: JSON.stringify({ origin: "https://example.com" }),
    }), createServices as never);
    expect(created.status).toBe(201);
    const payload = await created.json() as { domain: { id: string }; verification: { challengeToken: string } };
    expect(payload.verification.challengeToken).toMatch(/^fcv_/);

    const verifyServices = services(vi.fn(async () => [[
      `${WIDGET_VERIFICATION_PREFIX}${payload.verification.challengeToken}`,
    ]]));
    const verified = await handleWidgetDomainVerifyRequest(new Request(
      `https://foundcalc.test/api/workspace/widget-domains/${payload.domain.id}/verify`,
      { method: "POST" },
    ), payload.domain.id, verifyServices as never);
    expect(verified.status).toBe(200);
    await expect(verifyServices.domains.getForOwner("widget-owner", payload.domain.id)).resolves.toMatchObject({
      status: "active",
      verifiedAt: now,
    });

    const second = await handleWidgetDomainsRequest(new Request("https://foundcalc.test/api/workspace/widget-domains", {
      method: "POST",
      body: JSON.stringify({ origin: "https://second.example.com" }),
    }), services() as never);
    expect(second.status).toBe(403);
    await expect(second.json()).resolves.toEqual({ error: { code: "widget-domain-limit-reached" } });
  });

  it("creates an owner-scoped widget with canonical defaults and opaque public key", async () => {
    const response = await handleWidgetsRequest(new Request("https://foundcalc.test/api/workspace/widgets", {
      method: "POST",
      body: JSON.stringify({
        name: "Discount embed",
        calculatorId: "reference.discount",
        locale: "en",
        defaults: { baseAmount: "25" },
      }),
    }), services() as never);
    expect(response.status).toBe(201);
    const payload = await response.json() as { widget: { id: string; publicWidgetKey: string; defaultInputConfiguration: unknown } };
    expect(payload.widget.publicWidgetKey).toMatch(/^fcw_/);
    expect(payload.widget.defaultInputConfiguration).toEqual({ baseAmount: "25.00" });
    await expect(createWidgetRepository(env.DB).getForOwner("widget-owner", payload.widget.id)).resolves.toMatchObject({
      ownerUserId: "widget-owner",
      brandingPreference: "foundcalc",
    });
  });

  it("stores repeated completion events only as one daily aggregate row", async () => {
    const repository = createWidgetAnalyticsRepository(env.DB);
    const widgets = createWidgetRepository(env.DB);
    const domains = createWidgetDomainRepository(env.DB);
    const domain = await domains.create("widget-owner", {
      origin: "https://example.com",
      hostname: "example.com",
      displayHostname: "example.com",
      pairKey: "example.com",
      isLocalDevelopment: false,
    }, now);
    await domains.setStatus("widget-owner", domain.id, "active", now);
    const widget = await widgets.create({
      ownerUserId: "widget-owner",
      publicWidgetKey: "fcw_12345678901234567890123456789012",
      name: "Analytics widget",
      calculatorId: "reference.discount",
      locale: "en",
      status: "active",
      theme: { appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true },
      brandingPreference: "foundcalc",
      defaultInputConfiguration: {},
      createdAt: now,
    });
    const event = {
      widgetId: widget.id,
      domainId: domain.id,
      calculatorId: "reference.discount",
      locale: "en" as const,
      eventType: "calculation_completed" as const,
      eventDay: "2027-01-15",
    };
    await repository.increment(event, now);
    await repository.increment(event, now + 10);
    await expect(repository.listForWidget(widget.id, "2027-01-01")).resolves.toEqual([
      { ...event, count: 2, lastOccurredAt: now + 10 },
    ]);

    const eventTables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'widget_event%' ORDER BY name",
    ).all<{ name: string }>();
    expect(eventTables.results.map((row) => row.name)).toEqual(["widget_event_daily"]);
  });
});
