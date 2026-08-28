import { getReferenceCalculatorBySlug, referenceCatalog } from "@found-calc/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalculatorPageShell } from "@/components/calculator/calculator-page-shell";
import { DiscountCalculator } from "@/components/calculator/discount-calculator";
import { isLocale, locales } from "@/i18n/locales";

export function generateStaticParams() {
  return locales.flatMap((locale) => referenceCatalog.map((entry) => ({ locale, slug: entry.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getReferenceCalculatorBySlug(slug);

  if (!isLocale(locale) || entry === undefined) {
    notFound();
  }

  const copy = entry.copy[locale];
  return {
    title: `${copy.title} | Found Calc`,
    description: copy.description,
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const entry = getReferenceCalculatorBySlug(slug);

  if (!isLocale(locale) || entry === undefined) {
    notFound();
  }

  const placeholder =
    locale === "id"
      ? "Interaksi kalkulator akan dirender di area ini."
      : "Calculator interaction will render in this area.";

  return (
    <CalculatorPageShell locale={locale} entry={entry}>
      {entry.id === "reference.discount" ? (
        <DiscountCalculator locale={locale} entry={entry} />
      ) : (
        <section className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          {placeholder}
        </section>
      )}
    </CalculatorPageShell>
  );
}
