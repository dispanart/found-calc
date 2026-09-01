import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createWidgetAnalyticsRepository } from "@/lib/widgets/analytics-repository";
import { createWidgetDomainRepository } from "@/lib/widgets/domain-repository";
import { createWidgetRepository } from "@/lib/widgets/widget-repository";
import { resetPhase07bDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const insertUser = async (id: string, email: string) => {
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
  ).bind(id, id, email).run();
};

beforeEach(async () => {
  await resetPhase07bDatabase();
  await insertUser("widget-owner", "widget-owner@phase07b.test");
});

describe("Phase 07B widget repositories", () => {
  it("persists domain lifecycle and DNS verification without destructive downgrade semantics", async () => {
    const repository = createWidgetDomainRepository(env.DB);
    const domain = await repository.create("widget-owner", {
      origin: "https://example.com",
      hostname: "example.com",
      displayHostname: "example.com",
      pairKey: "example.com",
      isLocalDevelopment: false,
    }, 100);

    expect(domain).toMatchObject({ ownerUserId: "widget-owner", status: "pending", pairKey: "example.com" });
    expect(await repository.listForOwner("widget-owner")).toHaveLength(1);

    const verification = await repository.createVerification({
      domainId: domain.id,
      method: "dns_txt",
      challengeToken: "fcv_fixture_challenge_token_1234567890",
      expiresAt: 300,
      createdAt: 100,
    });
    expect(await repository.getPendingVerification(domain.id)).toMatchObject({ id: verification.id, status: "pending" });

    await repository.recordVerificationCheck(verification.id, 150);
    await repository.completeVerification(verification.id, domain.id, 160);
    expect(await repository.getForOwner("widget-owner", domain.id)).toMatchObject({ status: "active", verifiedAt: 160 });

    expect(await repository.softDelete("widget-owner", domain.id, 200)).toBe(true);
    expect(await repository.listForOwner("widget-owner")).toHaveLength(0);
  });

  it("persists widget configuration, bindings and public-key rotation without leaking owner identity", async () => {
    const domains = createWidgetDomainRepository(env.DB);
    const widgets = createWidgetRepository(env.DB);
    const domain = await domains.create("widget-owner", {
      origin: "https://example.com",
      hostname: "example.com",
      displayHostname: "example.com",
      pairKey: "example.com",
      isLocalDevelopment: false,
    }, 100);

    const widget = await widgets.create({
      ownerUserId: "widget-owner",
      publicWidgetKey: "fcw_fixture_public_key_1234567890123456",
      name: "Discount embed",
      calculatorId: "reference.discount",
      locale: "en",
      status: "active",
      theme: { appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true },
      brandingPreference: "foundcalc",
      defaultInputConfiguration: {},
      createdAt: 100,
    });

    expect(await widgets.getByPublicKey(widget.publicWidgetKey)).toMatchObject({ id: widget.id, ownerUserId: "widget-owner" });
    await widgets.bindDomain("widget-owner", widget.id, domain.id, 1);
    expect(await widgets.listBindings(widget.id)).toEqual([expect.objectContaining({ widgetId: widget.id, domainId: domain.id, priority: 1 })]);

    const rotated = await widgets.rotatePublicKey(
      "widget-owner",
      widget.id,
      "fcw_rotated_public_key_123456789012345",
      200,
    );
    expect(rotated).toMatchObject({ publicKeyVersion: 2, keyRotatedAt: 200 });
    expect(await widgets.getByPublicKey(widget.publicWidgetKey)).toBeNull();
    expect(await widgets.getByPublicKey("fcw_rotated_public_key_123456789012345")).toMatchObject({ id: widget.id });
  });

  it("upserts only privacy-safe daily analytics aggregates and supports retention cleanup", async () => {
    const domains = createWidgetDomainRepository(env.DB);
    const widgets = createWidgetRepository(env.DB);
    const analytics = createWidgetAnalyticsRepository(env.DB);
    const domain = await domains.create("widget-owner", {
      origin: "https://example.com", hostname: "example.com", displayHostname: "example.com", pairKey: "example.com", isLocalDevelopment: false,
    }, 100);
    const widget = await widgets.create({
      ownerUserId: "widget-owner",
      publicWidgetKey: "fcw_analytics_public_key_123456789012345",
      name: "Analytics widget",
      calculatorId: "reference.discount",
      locale: "id",
      status: "active",
      theme: { appearance: "light", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true },
      brandingPreference: "foundcalc",
      defaultInputConfiguration: {},
      createdAt: 100,
    });
    await widgets.bindDomain("widget-owner", widget.id, domain.id, 1);

    const event = {
      widgetId: widget.id,
      domainId: domain.id,
      calculatorId: "reference.discount",
      locale: "id" as const,
      eventType: "widget_viewed" as const,
      eventDay: "2026-08-31",
    };
    await analytics.increment(event, 1000);
    await analytics.increment(event, 1100);
    expect(await analytics.listForWidget(widget.id, "2026-08-01")).toEqual([
      expect.objectContaining({ ...event, count: 2, lastOccurredAt: 1100 }),
    ]);

    expect(await analytics.deleteBefore("2026-09-01")).toBe(1);
    expect(await analytics.listForWidget(widget.id, "2026-08-01")).toEqual([]);
  });
});
