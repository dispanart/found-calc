"use client";

import { getReferenceCalculatorById } from "@found-calc/catalog";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { fetchBillingStatus, type CommercialAccessClient } from "@/lib/billing/client";
import { fetchWidgetDetail, fetchWidgetDomains, patchWidget, rotateWidgetPublicKey, type WidgetClient, type WidgetDomainClient } from "@/lib/widgets/client";
import { WidgetAnalyticsSummary } from "./widget-analytics-summary";

type PreviewWidth = "320" | "390" | "container";

export function WidgetConfigurator({ locale, widgetId, embedOrigin }: { readonly locale: Locale; readonly widgetId: string; readonly embedOrigin: string }) {
  const [widget, setWidget] = useState<WidgetClient | null>(null);
  const [domains, setDomains] = useState<readonly WidgetDomainClient[]>([]);
  const [boundDomainIds, setBoundDomainIds] = useState<readonly string[]>([]);
  const [access, setAccess] = useState<CommercialAccessClient | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRotation, setConfirmRotation] = useState(false);
  const [status, setStatus] = useState("");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("container");

  useEffect(() => {
    let active = true;
    void Promise.all([fetchWidgetDetail(widgetId), fetchWidgetDomains(), fetchBillingStatus()])
      .then(([detail, nextDomains, billing]) => {
        if (!active) return;
        setWidget(detail.widget);
        setBoundDomainIds(detail.bindings.map((binding) => binding.domainId));
        setDomains(nextDomains);
        setAccess(billing.commercial ?? null);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [widgetId]);

  const boundDomain = domains.find((domain) => boundDomainIds.includes(domain.id));
  const catalog = widget ? getReferenceCalculatorById(widget.calculatorId) : undefined;
  const title = widget && catalog ? catalog.copy[widget.locale].title : "Found Calc calculator";
  const snippet = widget ? `<script defer src="${embedOrigin}/embed.js"></script>\n<div data-foundcalc-widget="${widget.publicWidgetKey}" data-foundcalc-title="${title}"></div>` : "";
  const analyticsEnabled = Boolean(access?.limits.standardWidgetAnalytics || access?.limits.advancedWidgetAnalytics);
  const advanced = Boolean(access?.limits.advancedWidgetAnalytics);
  const themeEnabled = Boolean(access?.limits.widgetCustomization);
  const brandingEnabled = Boolean(access?.limits.removeWidgetBranding);
  const appearance = widget?.theme.appearance ?? "system";
  const accent = widget?.theme.accent ?? "brand";
  const effectiveStatus = widget?.status === "disabled" ? "Disabled" : widget?.status === "revoked" ? "Revoked" : "Active";
  const previewStyle = previewWidth === "container" ? { width: "100%" } : { width: `${previewWidth}px`, maxWidth: "100%" };

  const mutate = async (action: () => Promise<WidgetClient>, success: string) => { setBusy(true); setStatus(""); try { const next = await action(); setWidget(next); setStatus(success); } catch { setStatus(locale === "id" ? "Perubahan belum dapat disimpan." : "Changes could not be saved."); } finally { setBusy(false); } };
  const themePatch = async (next: { appearance?: "light" | "dark" | "system"; accent?: "brand" | "blue" | "teal" }) => { if (!widget || !themeEnabled) return; await mutate(() => patchWidget(widget.id, { theme: { ...widget.theme, ...next } }), locale === "id" ? "Tampilan diperbarui." : "Appearance updated."); };

  if (failed) return <p role="alert" className="text-sm text-muted-foreground">{locale === "id" ? "Widget tidak dapat dimuat." : "Widget could not be loaded."}</p>;
  if (!widget) return <p role="status" className="text-sm text-muted-foreground">{locale === "id" ? "Memuat widget…" : "Loading widget…"}</p>;
  return <div className="space-y-10">
    <section className="border-t border-border pt-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{effectiveStatus}</p><h2 className="mt-2 text-2xl font-bold">{widget.name}</h2><p className="mt-2 text-sm text-muted-foreground">{title} · {boundDomain?.displayHostname ?? "No effective domain"}</p></div><Link href={`/${locale}/workspace/widgets`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{locale === "id" ? "Kembali ke Widgets" : "Back to Widgets"}</Link></div></section>
    <section className="border-t border-border pt-7"><h2 className="text-xl font-bold">Runtime</h2><div className="mt-5 flex flex-wrap gap-3">{widget.status === "active" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void mutate(() => patchWidget(widget.id, { status: "disabled" }), locale === "id" ? "Widget dinonaktifkan." : "Widget disabled.")}>Disable widget</Button> : widget.status === "disabled" ? <Button type="button" disabled={busy} onClick={() => void mutate(() => patchWidget(widget.id, { status: "active" }), locale === "id" ? "Widget diaktifkan." : "Widget enabled.")}>Enable widget</Button> : null}<Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmRotation(true)}>Rotate public key</Button>{confirmRotation ? <Button type="button" disabled={busy} onClick={() => void mutate(async () => { const next = await rotateWidgetPublicKey(widget.id); setConfirmRotation(false); return next; }, "Public key rotated. Replace the old embed code.")}>Confirm key rotation</Button> : null}</div>{status ? <p role="status" className="mt-4 text-sm font-semibold">{status}</p> : null}</section>
    <section className="border-t border-border pt-7"><h2 className="text-xl font-bold">Appearance</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Appearance<select className="mt-2 min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 disabled:opacity-60" disabled={!themeEnabled || busy} value={appearance} onChange={(event) => void themePatch({ appearance: event.target.value as typeof appearance })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="text-sm font-medium">Accent<select className="mt-2 min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 disabled:opacity-60" disabled={!themeEnabled || busy} value={accent} onChange={(event) => void themePatch({ accent: event.target.value as typeof accent })}><option value="brand">Brand</option><option value="blue">Blue</option><option value="teal">Teal</option></select></label></div><p className="mt-4 text-sm text-muted-foreground">{brandingEnabled ? (widget.brandingPreference === "hidden" ? "Found Calc attribution is hidden for this widget." : "Found Calc attribution is visible.") : "Friends keeps Powered by Found Calc visible."}</p></section>
    <section className="border-t border-border pt-7"><h2 className="text-xl font-bold">{locale === "id" ? "Kode embed" : "Embed code"}</h2>{boundDomain?.verifiedAt !== null && boundDomain?.status === "active" ? <pre data-testid="widget-embed-code" className="mt-4 max-w-full overflow-auto rounded-[var(--radius-control)] bg-foreground p-4 text-xs text-background"><code>{snippet}</code></pre> : <p className="mt-3 text-sm text-muted-foreground">Needs verification</p>}</section>
    <section className="border-t border-border pt-7"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Preview</h2><div className="flex flex-wrap gap-2" aria-label="Preview width"><Button type="button" variant={previewWidth === "320" ? "default" : "secondary"} onClick={() => setPreviewWidth("320")}>320</Button><Button type="button" variant={previewWidth === "390" ? "default" : "secondary"} onClick={() => setPreviewWidth("390")}>390</Button><Button type="button" variant={previewWidth === "container" ? "default" : "secondary"} onClick={() => setPreviewWidth("container")}>Container</Button></div></div><div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-border bg-muted/30 p-3"><iframe title={`${widget.name} preview`} src={`/widget-preview/${encodeURIComponent(widget.id)}`} style={previewStyle} className="mx-auto block min-h-[620px] border-0 bg-background" sandbox="allow-scripts allow-same-origin" /></div></section>
    <WidgetAnalyticsSummary locale={locale} widgetId={widget.id} enabled={analyticsEnabled} advanced={advanced} />
  </div>;
}
