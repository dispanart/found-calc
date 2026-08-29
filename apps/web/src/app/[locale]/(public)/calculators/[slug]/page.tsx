import { getReferenceCalculatorBySlug, referenceCatalog } from "@found-calc/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BusinessMarginCalculator } from "@/components/calculator/business-margin-calculator";
import { CalculatorPageShell } from "@/components/calculator/calculator-page-shell";
import { DiscountCalculator } from "@/components/calculator/discount-calculator";
import { SyntheticRuleCalculator } from "@/components/calculator/synthetic-rule-calculator";
import { isLocale, locales } from "@/i18n/locales";
import { isWorkspaceId } from "@/lib/workspace/contracts";

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
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ record?: string | string[] }>;
}) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const entry = getReferenceCalculatorBySlug(slug);
  const requestedRecord = Array.isArray(query.record) ? query.record[0] : query.record;
  const recordId = isWorkspaceId(requestedRecord) ? requestedRecord : undefined;

  if (!isLocale(locale) || entry === undefined) {
    notFound();
  }

  return (
    <CalculatorPageShell locale={locale} entry={entry}>
      {entry.id === "reference.discount" ? (
        <DiscountCalculator locale={locale} entry={entry} recordId={recordId} />
      ) : entry.id === "reference.business-margin" ? (
        <BusinessMarginCalculator locale={locale} entry={entry} recordId={recordId} />
      ) : (
        <SyntheticRuleCalculator locale={locale} entry={entry} recordId={recordId} />
      )}
    </CalculatorPageShell>
  );
}
