import { describe, expect, it } from "vitest";

import { FOUND_CALC_WIDGET_PROTOCOL_VERSION, parseWidgetMessage } from "./protocol";

describe("widget lifecycle protocol", () => {
  it("accepts only the versioned ready and resize envelopes", () => {
    expect(FOUND_CALC_WIDGET_PROTOCOL_VERSION).toBe(1);
    expect(parseWidgetMessage({ type: "foundcalc:ready", protocolVersion: 1, widgetKey: "fcw_example" })).toEqual({
      type: "foundcalc:ready", protocolVersion: 1, widgetKey: "fcw_example",
    });
    expect(parseWidgetMessage({ type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: 640 })).toEqual({
      type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: 640,
    });
  });

  it.each([
    null,
    {},
    { type: "foundcalc:calculate", protocolVersion: 1, widgetKey: "fcw_example" },
    { type: "foundcalc:ready", protocolVersion: 2, widgetKey: "fcw_example" },
    { type: "foundcalc:ready", protocolVersion: 1, widgetKey: "" },
    { type: "foundcalc:ready", protocolVersion: 1, widgetKey: "fcw_example", command: "setInput" },
    { type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: Number.NaN },
    { type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: -1 },
    { type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: 4001 },
    { type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: 200.5 },
    { type: "foundcalc:resize", protocolVersion: 1, widgetKey: "fcw_example", heightPx: 300, input: "secret" },
  ])("rejects malformed or command-like payload %#", (value) => {
    expect(parseWidgetMessage(value)).toBeNull();
  });
});
