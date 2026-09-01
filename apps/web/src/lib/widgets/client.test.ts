import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchWidgetDomains,
  fetchWidgets,
  parseWidgetAnalyticsPayload,
  parseWidgetDetailPayload,
  parseWidgetDomainsPayload,
  parseWidgetsPayload,
} from "./client";

const widget = {
  id: "widget-1",
  publicWidgetKey: "fcw_12345678901234567890123456789012",
  publicKeyVersion: 1,
  name: "Store discount",
  calculatorId: "reference.discount",
  locale: "en",
  status: "active",
  theme: { appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true },
  brandingPreference: "foundcalc",
  defaultInputConfiguration: { baseAmount: "100.00" },
  keyRotatedAt: null,
  createdAt: 10,
  updatedAt: 20,
} as const;
const domain = {
  id: "domain-1", hostname: "example.com", displayHostname: "example.com", status: "active",
  verifiedAt: 15, createdAt: 10, updatedAt: 15,
} as const;

afterEach(() => vi.unstubAllGlobals());

describe("widget management client DTOs", () => {
  it("decodes strict widget, domain, detail, and aggregate analytics payloads", () => {
    expect(parseWidgetsPayload({ widgets: [widget] })).toEqual([widget]);
    expect(parseWidgetDomainsPayload({ domains: [domain] })).toEqual([domain]);
    expect(parseWidgetDetailPayload({ widget, bindings: [{ widgetId: "widget-1", domainId: "domain-1", priority: 0, createdAt: 10 }] })).toEqual({
      widget,
      bindings: [{ widgetId: "widget-1", domainId: "domain-1", priority: 0, createdAt: 10 }],
    });
    expect(parseWidgetAnalyticsPayload({ level: "standard", days: 7, events: [{
      widgetId: "widget-1", domainId: "domain-1", calculatorId: "reference.discount", locale: "en",
      eventType: "widget_viewed", eventDay: "2026-08-31", count: 3, lastOccurredAt: 20,
    }] })).toMatchObject({ level: "standard", days: 7, events: [{ count: 3 }] });
  });

  it("rejects unexpected provider or billing identifiers", () => {
    expect(parseWidgetsPayload({ widgets: [{ ...widget, providerId: "secret" }] })).toBeNull();
    expect(parseWidgetDomainsPayload({ domains: [{ ...domain, billingId: "secret" }] })).toBeNull();
  });

  it("uses credentialed no-store fetches and maps API errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ widgets: [] }))
      .mockResolvedValueOnce(Response.json({ domains: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchWidgets()).resolves.toEqual([]);
    await expect(fetchWidgetDomains()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/workspace/widgets", expect.objectContaining({ credentials: "include", cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/workspace/widget-domains", expect.objectContaining({ credentials: "include", cache: "no-store" }));

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "widget-domain-limit-reached" } }, { status: 403 })));
    await expect(fetchWidgetDomains()).rejects.toMatchObject({
      code: "widget-domain-limit-reached", status: 403,
    });
  });
});