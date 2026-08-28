import { referenceCatalog } from "@found-calc/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMessages } from "@/i18n/messages";
import { isLocale } from "@/i18n/locales";

export const metadata: Metadata = {
  title: "Calculators | Found Calc",
  description: "Localized reference calculators with deterministic truth and visible rule provenance.",
};

export default async function CalculatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-18">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{messages.discoveryEyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{messages.calculatorsTitle}</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">{messages.calculatorsDescription}</p>
      </header>

      <div className="mt-12 min-w-0 divide-y divide-border border-y border-border">
        {referenceCatalog.map((entry, index) => {
          const copy = entry.copy[locale];
          return (
            <article key={entry.id} className="grid min-w-0 gap-3 py-7 md:grid-cols-[4rem_minmax(0,1fr)_minmax(11rem,0.38fr)] md:gap-8">
              <p className="text-sm font-semibold text-primary">0{index + 1}</p>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{copy.categoryLabel}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">
                  <Link className="rounded-sm hover:text-primary" href={`/${locale}/calculators/${entry.slug}`}>
                    {copy.title}
                  </Link>
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
              </div>
              <div className="min-w-0 text-sm leading-6 text-muted-foreground md:pt-7">
                <p className="font-semibold text-foreground">{copy.trustTitle}</p>
                <p className="mt-1">{copy.trustBody}</p>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
