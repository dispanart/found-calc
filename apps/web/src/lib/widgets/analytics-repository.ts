import type { D1Database } from "@cloudflare/workers-types";

import type { WidgetEventType } from "./contracts";
import type { WidgetLocale } from "./widget-repository";

export interface WidgetDailyEventKey {
  readonly widgetId: string;
  readonly domainId: string;
  readonly calculatorId: string;
  readonly locale: WidgetLocale;
  readonly eventType: WidgetEventType;
  readonly eventDay: string;
}

export interface StoredWidgetDailyEvent extends WidgetDailyEventKey {
  readonly count: number;
  readonly lastOccurredAt: number;
}

type EventRow = {
  widget_id: string; domain_id: string; calculator_id: string; locale: WidgetLocale;
  event_type: WidgetEventType; event_day: string; count: number; last_occurred_at: number;
};
const decode = (row: EventRow): StoredWidgetDailyEvent => ({
  widgetId: row.widget_id, domainId: row.domain_id, calculatorId: row.calculator_id,
  locale: row.locale, eventType: row.event_type, eventDay: row.event_day,
  count: row.count, lastOccurredAt: row.last_occurred_at,
});

export const createWidgetAnalyticsRepository = (db: D1Database) => {
  const increment = async (event: WidgetDailyEventKey, occurredAt: number): Promise<void> => {
    await db.prepare(`
      INSERT INTO widget_event_daily
        (widget_id, domain_id, calculator_id, locale, event_type, event_day, count, last_occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(widget_id, domain_id, calculator_id, locale, event_type, event_day)
      DO UPDATE SET
        count = widget_event_daily.count + 1,
        last_occurred_at = MAX(widget_event_daily.last_occurred_at, excluded.last_occurred_at)
    `).bind(
      event.widgetId, event.domainId, event.calculatorId, event.locale, event.eventType, event.eventDay, occurredAt,
    ).run();
  };
  const listForWidget = async (widgetId: string, fromDay: string): Promise<StoredWidgetDailyEvent[]> => {
    const rows = await db.prepare(`
      SELECT * FROM widget_event_daily
      WHERE widget_id = ? AND event_day >= ?
      ORDER BY event_day ASC, event_type ASC, domain_id ASC
    `).bind(widgetId, fromDay).all<EventRow>();
    return rows.results.map(decode);
  };
  const deleteBefore = async (cutoffDay: string): Promise<number> => {
    const result = await db.prepare("DELETE FROM widget_event_daily WHERE event_day < ?").bind(cutoffDay).run();
    return Number(result.meta.changes ?? 0);
  };
  return { increment, listForWidget, deleteBefore } as const;
};
