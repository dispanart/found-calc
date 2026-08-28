import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n/locales";
import { getMessages } from "@/i18n/messages";
import { RelatedCalculators } from "./related-calculators";

interface CalculatorPageShellProps {
  locale: Locale;
  entry: ReferenceCatalogEntry;
  children: ReactNode;
}

export function CalculatorPageShell({ locale, entry, children }: CalculatorPageShellProps) {
  const messages = getMessages(locale);
  const copy = entry.copy[locale];
  const classificationLabel =
    entry.classification === "rule-based"
      ? locale === "id"
        ? "Berbasis aturan versi"
        : "Versioned rule based"
      : locale === "id"
        ? "Deterministik"
        : "Deterministic";

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="min-w-0">
        <Link
          href={`/${locale}/calculators`}
          className="inline-flex rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {messages.calculatorBack}
        </Link>

        <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.38fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{copy.categoryLabel}</p>
            <h1 className="mt-4 max-w-4xl text-4xl leading-[1.02] font-bold tracking-[-0.05em] text-balance sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{copy.description}</p>
          </div>

          <aside className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
            <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{classificationLabel}</p>
            <h2 className="mt-3 text-lg font-bold tracking-[-0.025em]">{copy.trustTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.trustBody}</p>
          </aside>
        </div>

        <div className="mt-10 min-w-0">{children}</div>
        <div className="mt-14 min-w-0">
          <RelatedCalculators locale={locale} entry={entry} />
        </div>
      </div>
    </main>
  );
}
