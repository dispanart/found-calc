import { notFound } from "next/navigation";

import { PricingPanel } from "@/components/billing/pricing-panel";
import { isLocale } from "@/i18n/locales";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-18">
      <PricingPanel locale={locale} />
    </main>
  );
}
