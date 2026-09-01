import { notFound } from "next/navigation";

import { WidgetManager } from "@/components/widgets/widget-manager";
import { isLocale } from "@/i18n/locales";

export default async function WorkspaceWidgetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const embedOrigin = (process.env.FOUNDCALC_EMBED_ORIGIN ?? process.env.EMBED_APP_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  return <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-18"><header className="max-w-3xl"><p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 07B</p><h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{locale === "id" ? "Kalkulator website" : "Website calculators"}</h1><p className="mt-5 text-base leading-7 text-muted-foreground">{locale === "id" ? "Pasang kalkulator Found Calc yang sama di website Anda melalui iframe terisolasi, domain terverifikasi, dan kapabilitas paket yang diterapkan server." : "Place the same Found Calc calculators on your website through an isolated iframe, verified domains, and server-enforced plan capabilities."}</p></header><div className="mt-10"><WidgetManager locale={locale} embedOrigin={embedOrigin} /></div></main>;
}
