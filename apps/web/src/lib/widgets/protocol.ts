export const FOUND_CALC_WIDGET_PROTOCOL_VERSION = 1 as const;

export type FoundCalcWidgetMessage =
  | {
      readonly type: "foundcalc:ready";
      readonly protocolVersion: 1;
      readonly widgetKey: string;
    }
  | {
      readonly type: "foundcalc:resize";
      readonly protocolVersion: 1;
      readonly widgetKey: string;
      readonly heightPx: number;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validWidgetKey = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 128 && !/\s/.test(value);

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]) => {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
};

export const parseWidgetMessage = (value: unknown): FoundCalcWidgetMessage | null => {
  if (!isRecord(value) || value.protocolVersion !== FOUND_CALC_WIDGET_PROTOCOL_VERSION || !validWidgetKey(value.widgetKey)) {
    return null;
  }

  if (value.type === "foundcalc:ready") {
    if (!exactKeys(value, ["type", "protocolVersion", "widgetKey"])) return null;
    return {
      type: "foundcalc:ready",
      protocolVersion: FOUND_CALC_WIDGET_PROTOCOL_VERSION,
      widgetKey: value.widgetKey,
    };
  }

  if (value.type === "foundcalc:resize") {
    if (!exactKeys(value, ["type", "protocolVersion", "widgetKey", "heightPx"])) return null;
    if (
      typeof value.heightPx !== "number"
      || !Number.isFinite(value.heightPx)
      || !Number.isInteger(value.heightPx)
      || value.heightPx < 0
      || value.heightPx > 4000
    ) return null;
    return {
      type: "foundcalc:resize",
      protocolVersion: FOUND_CALC_WIDGET_PROTOCOL_VERSION,
      widgetKey: value.widgetKey,
      heightPx: value.heightPx,
    };
  }

  return null;
};
