import { notFound } from "next/navigation";

import { WidgetManager } from "@/components/widgets/widget-manager";
import { isLocale } from "@/i18n/locales";

export default async function WorkspaceWidgetDetailPage({ params }: { params: Promise<{ locale: string; widgetId: string }> }) {
  const { locale, widgetId } = await params;
  if (!isLocale(locale) || !widgetId) notFound();
  const embedOrigin = (process.env.FOUNDCALC_EMBED_ORIGIN ?? process.env.EMBED_APP_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  return <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-18"><header className="max-w-3xl"><p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 07B</p><h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{locale === "id" ? "Konfigurasi widget" : "Widget configuration"}</h1><p className="mt-5 text-base leading-7 text-muted-foreground">{locale === "id" ? "Perubahan tetap tunduk pada akses komersial dan domain efektif saat ini." : "Changes remain subject to current commercial access and effective-domain authorization."}</p></header><div className="mt-10"><WidgetManager locale={locale} embedOrigin={embedOrigin} widgetId={widgetId} /></div></main>;
}
