"use client";

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/i18n/locales";
import { fetchWidgetAnalytics, type WidgetAnalyticsClient } from "@/lib/widgets/client";

export function WidgetAnalyticsSummary({ locale, widgetId, enabled, advanced }: { readonly locale: Locale; readonly widgetId: string; readonly enabled: boolean; readonly advanced: boolean }) {
  const [analytics, setAnalytics] = useState<WidgetAnalyticsClient | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchWidgetAnalytics(widgetId, advanced ? 30 : 7).then((value) => { if (active) setAnalytics(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [advanced, enabled, widgetId]);
  const totals = useMemo(() => {
    const result = new Map<string, number>();
    for (const event of analytics?.events ?? []) result.set(event.eventType, (result.get(event.eventType) ?? 0) + event.count);
    return result;
  }, [analytics]);
  if (!enabled) return null;
  return <section className="border-t border-border pt-7" aria-labelledby="widget-analytics-title"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="widget-analytics-title" className="text-xl font-bold">{locale === "id" ? "Analitik agregat" : "Aggregate analytics"}</h2><span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{advanced ? "30 days" : "7 days"}</span></div>{failed ? <p className="mt-3 text-sm text-muted-foreground">{locale === "id" ? "Analitik belum dapat dimuat." : "Analytics could not be loaded."}</p> : !analytics ? <p className="mt-3 text-sm text-muted-foreground" role="status">{locale === "id" ? "Memuat analitik…" : "Loading analytics…"}</p> : <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["widget_viewed", locale === "id" ? "Dilihat" : "Views"], ["calculator_started", locale === "id" ? "Dimulai" : "Starts"], ["calculation_completed", locale === "id" ? "Selesai dihitung" : "Completions"], ["cta_clicked", "CTA"]].map(([key, label]) => <div key={key} className="border-l-2 border-border pl-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-bold">{totals.get(key!) ?? 0}</dd></div>)}</dl>}</section>;
}
