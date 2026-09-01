"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import { fetchBillingStatus, type CommercialAccessClient } from "@/lib/billing/client";
import { fetchWidgetDetail, fetchWidgetDomains, fetchWidgets, type WidgetBindingClient, type WidgetClient, type WidgetDomainClient } from "@/lib/widgets/client";
import { WidgetConfigurator } from "./widget-configurator";
import { WidgetCreationFlow } from "./widget-creation-flow";
import { WidgetList } from "./widget-list";

const friendsFallback: CommercialAccessClient = {
  tier: "friends", source: "friends", keys: [], accessUntil: null,
  limits: { savedCalculations: 5, historyDays: 7, activeGoals: 1, activeProjects: 1, widgetDomains: 1, teamSeats: 1, removeWidgetBranding: false, widgetCustomization: false, standardWidgetAnalytics: false, whiteLabelWidgets: false, advancedWidgetAnalytics: false, portfolioEnabled: false, bulkSku: false, csvImport: false, multiMarketplace: false, multiStoreBusiness: false, campaignPortfolio: false },
};

const fetchWidgetManagerSnapshot = async () => {
  const [widgets, domains, billing] = await Promise.all([fetchWidgets(), fetchWidgetDomains(), fetchBillingStatus()]);
  const details = await Promise.all(widgets.map((widget) => fetchWidgetDetail(widget.id)));
  return {
    widgets,
    domains,
    bindingsByWidget: Object.fromEntries(details.map((detail) => [detail.widget.id, detail.bindings])) as Readonly<Record<string, readonly WidgetBindingClient[]>>,
    access: billing.commercial ?? friendsFallback,
  };
};

export function WidgetManager({ locale, embedOrigin, widgetId }: { readonly locale: Locale; readonly embedOrigin: string; readonly widgetId?: string }) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [widgets, setWidgets] = useState<readonly WidgetClient[]>([]);
  const [domains, setDomains] = useState<readonly WidgetDomainClient[]>([]);
  const [bindingsByWidget, setBindingsByWidget] = useState<Readonly<Record<string, readonly WidgetBindingClient[]>>>({});
  const [access, setAccess] = useState<CommercialAccessClient>(friendsFallback);
  const [creating, setCreating] = useState(false);
  const [loadedFor, setLoadedFor] = useState("");
  const [failed, setFailed] = useState(false);

  const refresh = async (ownerId: string) => {
    const snapshot = await fetchWidgetManagerSnapshot();
    setWidgets(snapshot.widgets);
    setDomains(snapshot.domains);
    setBindingsByWidget(snapshot.bindingsByWidget);
    setAccess(snapshot.access);
    setLoadedFor(ownerId);
    setFailed(false);
  };

  useEffect(() => {
    if (!userId || widgetId) return;
    let active = true;
    void fetchWidgetManagerSnapshot()
      .then((snapshot) => {
        if (!active) return;
        setWidgets(snapshot.widgets);
        setDomains(snapshot.domains);
        setBindingsByWidget(snapshot.bindingsByWidget);
        setAccess(snapshot.access);
        setLoadedFor(userId);
        setFailed(false);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoadedFor(userId);
        }
      });
    return () => { active = false; };
  }, [userId, widgetId]);

  const loading = Boolean(userId && !widgetId && loadedFor !== userId);
  const planLabel = access.tier === "friends" ? "Friends" : access.tier === "besties" ? "Besties" : "Family";
  const activeDomainCount = useMemo(() => domains.filter((domain) => domain.status === "active" && domain.verifiedAt !== null).length, [domains]);

  if (isPending) return <p role="status" className="text-sm text-muted-foreground">{locale === "id" ? "Memuat akun…" : "Loading account…"}</p>;
  if (!session?.user) return <section className="border-t border-border pt-7"><h2 className="text-2xl font-bold">{locale === "id" ? "Masuk untuk mengelola kalkulator website" : "Sign in to manage website calculators"}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{locale === "id" ? "Kalkulator publik tetap bebas akun. Workspace Widgets hanya menyimpan konfigurasi embed dan domain yang Anda verifikasi." : "Public calculators remain account-free. The Widgets workspace stores only your embed configuration and verified domains."}</p><Link href={`/${locale}/auth`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-semibold text-primary-foreground">Sign in</Link></section>;
  if (widgetId) return <WidgetConfigurator locale={locale} widgetId={widgetId} embedOrigin={embedOrigin} />;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">{locale === "id" ? "Memuat Widgets…" : "Loading Widgets…"}</p>;

  return <div><section className="border-t border-border pt-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{planLabel}</p><h2 className="mt-2 text-2xl font-bold">{locale === "id" ? "Kelola embed yang terverifikasi" : "Manage verified embeds"}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{locale === "id" ? `${activeDomainCount} dari ${access.limits.widgetDomains} domain efektif digunakan.` : `${activeDomainCount} of ${access.limits.widgetDomains} effective domains in use.`}</p></div><Button type="button" onClick={() => setCreating(true)}>Create website calculator</Button></div>{failed ? <p role="alert" className="mt-4 text-sm text-muted-foreground">{locale === "id" ? "Sebagian data Widget belum dapat dimuat." : "Some widget data could not be loaded."}</p> : null}</section>{creating ? <WidgetCreationFlow locale={locale} access={access} initialDomains={domains} embedOrigin={embedOrigin} onCancel={() => setCreating(false)} onDomainAdded={(domain) => setDomains((current) => [...current.filter((item) => item.id !== domain.id), domain])} onCreated={(widget) => { setWidgets((current) => [...current.filter((item) => item.id !== widget.id), widget]); if (userId) void refresh(userId); }} /> : null}<WidgetList locale={locale} widgets={widgets} domains={domains} bindingsByWidget={bindingsByWidget} tier={access.tier} /></div>;
}
