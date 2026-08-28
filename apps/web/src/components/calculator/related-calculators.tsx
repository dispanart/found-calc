import { getReferenceCalculatorById, type ReferenceCatalogEntry } from "@found-calc/catalog";
import Link from "next/link";

import type { Locale } from "@/i18n/locales";
import { getMessages } from "@/i18n/messages";

interface RelatedCalculatorsProps {
  locale: Locale;
  entry: ReferenceCatalogEntry;
}

export function RelatedCalculators({ locale, entry }: RelatedCalculatorsProps) {
  const messages = getMessages(locale);
  const related = entry.relatedCalculatorIds
    .map((id) => getReferenceCalculatorById(id))
    .filter((candidate): candidate is ReferenceCatalogEntry => candidate !== undefined);

  if (related.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-calculators-title" className="border-t border-border pt-10">
      <h2 id="related-calculators-title" className="text-xl font-bold tracking-[-0.03em]">
        {messages.relatedTitle}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {related.map((candidate) => (
          <Link
            key={candidate.id}
            href={`/${locale}/calculators/${candidate.slug}`}
            className="min-w-0 rounded-[var(--radius-control)] border border-border bg-card p-4 hover:border-primary/45"
          >
            <span className="block text-sm font-semibold">{candidate.copy[locale].title}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {candidate.copy[locale].categoryLabel}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
