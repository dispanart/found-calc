"use client";

import Link from "next/link";

import type { Locale } from "@/i18n/locales";
import type { WidgetBindingClient, WidgetClient, WidgetDomainClient } from "@/lib/widgets/client";

const copy = {
  en: { name: "Widget Name", calculator: "Calculator", domain: "Domain", capability: "Plan capability", status: "Status", branding: "Branding", activity: "Last activity", actions: "Actions", manage: "Manage", none: "No website calculators yet.", active: "Active", disabled: "Disabled", revoked: "Revoked", foundcalc: "Powered by Found Calc", hidden: "Hidden" },
  id: { name: "Nama Widget", calculator: "Kalkulator", domain: "Domain", capability: "Kapabilitas paket", status: "Status", branding: "Branding", activity: "Aktivitas terakhir", actions: "Aksi", manage: "Kelola", none: "Belum ada kalkulator website.", active: "Aktif", disabled: "Dinonaktifkan", revoked: "Dicabut", foundcalc: "Powered by Found Calc", hidden: "Disembunyikan" },
} as const;

const calculatorLabel = (id: WidgetClient["calculatorId"]) => id === "reference.discount" ? "Discount" : id === "reference.business-margin" ? "Business Margin" : "Versioned Rule Reference";
const dateLabel = (timestamp: number, locale: Locale) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium" }).format(new Date(timestamp));

export function WidgetList({ locale, widgets, domains, bindingsByWidget, tier }: {
  readonly locale: Locale;
  readonly widgets: readonly WidgetClient[];
  readonly domains: readonly WidgetDomainClient[];
  readonly bindingsByWidget: Readonly<Record<string, readonly WidgetBindingClient[]>>;
  readonly tier: "friends" | "besties" | "family";
}) {
  const text = copy[locale];
  const domainById = new Map(domains.map((domain) => [domain.id, domain] as const));
  if (widgets.length === 0) return <p className="border-t border-border pt-6 text-sm text-muted-foreground">{text.none}</p>;

  const row = (widget: WidgetClient) => {
    const domain = bindingsByWidget[widget.id]?.[0] ? domainById.get(bindingsByWidget[widget.id]![0]!.domainId) : undefined;
    const status = widget.status === "active" ? text.active : widget.status === "disabled" ? text.disabled : text.revoked;
    return { widget, domain: domain?.displayHostname ?? "—", status, branding: widget.brandingPreference === "hidden" ? text.hidden : text.foundcalc };
  };

  return (
    <section aria-labelledby="widget-list-title" className="mt-10">
      <h2 id="widget-list-title" className="text-xl font-bold tracking-[-0.02em]">{locale === "id" ? "Kalkulator website Anda" : "Your website calculators"}</h2>
      <div className="mt-5 hidden overflow-hidden rounded-[var(--radius-card)] border border-border md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground"><tr><th className="px-4 py-3">{text.name}</th><th className="px-4 py-3">{text.calculator}</th><th className="px-4 py-3">{text.domain}</th><th className="px-4 py-3">{text.capability}</th><th className="px-4 py-3">{text.status}</th><th className="px-4 py-3">{text.branding}</th><th className="px-4 py-3">{text.activity}</th><th className="px-4 py-3">{text.actions}</th></tr></thead>
          <tbody>{widgets.map((widget) => { const item = row(widget); return <tr key={widget.id} className="border-t border-border"><th scope="row" className="px-4 py-4 font-semibold">{widget.name}</th><td className="px-4 py-4">{calculatorLabel(widget.calculatorId)}</td><td className="px-4 py-4">{item.domain}</td><td className="px-4 py-4 capitalize">{tier}</td><td className="px-4 py-4">{item.status}</td><td className="px-4 py-4">{item.branding}</td><td className="px-4 py-4">{dateLabel(widget.updatedAt, locale)}</td><td className="px-4 py-4"><Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/${locale}/workspace/widgets/${widget.id}`}>{text.manage} {widget.name}</Link></td></tr>; })}</tbody>
        </table>
      </div>
      <div className="mt-5 space-y-4 md:hidden">{widgets.map((widget) => { const item = row(widget); return <article key={widget.id} className="rounded-[var(--radius-card)] border border-border p-5"><h3 className="text-lg font-bold">{widget.name}</h3><dl className="mt-4 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm"><dt className="text-muted-foreground">{text.calculator}</dt><dd>{calculatorLabel(widget.calculatorId)}</dd><dt className="text-muted-foreground">{text.domain}</dt><dd className="break-words">{item.domain}</dd><dt className="text-muted-foreground">{text.capability}</dt><dd className="capitalize">{tier}</dd><dt className="text-muted-foreground">{text.status}</dt><dd>{item.status}</dd><dt className="text-muted-foreground">{text.branding}</dt><dd>{item.branding}</dd><dt className="text-muted-foreground">{text.activity}</dt><dd>{dateLabel(widget.updatedAt, locale)}</dd></dl><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href={`/${locale}/workspace/widgets/${widget.id}`}>{text.manage} {widget.name}</Link></article>; })}</div>
    </section>
  );
}
