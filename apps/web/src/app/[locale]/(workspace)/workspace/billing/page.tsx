import { notFound } from "next/navigation";

import { BillingPanel } from "@/components/billing/billing-panel";
import { isLocale } from "@/i18n/locales";

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-18">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 07 · Billing &amp; access</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          {locale === "id" ? "Billing dan akses" : "Billing and access"}
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {locale === "id"
            ? "Lihat status subscription dan entitlement yang sudah dikonfirmasi server. Kalkulator publik tetap terpisah dari billing dan tetap tersedia tanpa akun."
            : "Inspect server-confirmed subscription state and entitlements. Public calculators remain separate from billing and continue to work without an account."}
        </p>
      </header>
      <div className="mt-10"><BillingPanel locale={locale} /></div>
    </main>
  );
}
