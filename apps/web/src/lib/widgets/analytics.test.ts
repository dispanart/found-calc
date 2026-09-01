import { describe, expect, it } from "vitest";

import { parseWidgetAnalyticsEvent } from "./analytics";

const key = "fcw_12345678901234567890123456789012";

describe("privacy-safe widget analytics parser", () => {
  it.each([
    "widget_viewed",
    "calculator_started",
    "calculation_completed",
    "cta_clicked",
  ] as const)("accepts the bounded %s aggregate event", (eventType) => {
    expect(parseWidgetAnalyticsEvent({
      schemaVersion: 1,
      eventType,
      widgetKey: key,
      parentOrigin: "https://customer.example",
    })).toEqual({
      schemaVersion: 1,
      eventType,
      widgetKey: key,
      parentOrigin: "https://customer.example",
    });
  });

  it.each([
    null,
    {},
    { schemaVersion: 2, eventType: "widget_viewed", widgetKey: key, parentOrigin: "https://customer.example" },
    { schemaVersion: 1, eventType: "unknown", widgetKey: key, parentOrigin: "https://customer.example" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: "guess", parentOrigin: "https://customer.example" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: key, parentOrigin: "javascript:alert(1)" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: key, parentOrigin: "https://customer.example/path" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: key, parentOrigin: "https://customer.example", input: "secret" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: key, parentOrigin: "https://customer.example", result: "secret" },
    { schemaVersion: 1, eventType: "widget_viewed", widgetKey: key, parentOrigin: "https://customer.example", amount: "100" },
  ])("rejects malformed or raw-value-shaped payload %#", (value) => {
    expect(parseWidgetAnalyticsEvent(value)).toBeNull();
  });
});
