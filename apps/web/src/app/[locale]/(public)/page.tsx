import { referenceCatalog } from "@found-calc/catalog";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";
import { isLocale } from "@/i18n/locales";

export default async function PublicFoundationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-end lg:gap-16">
        <div className="min-w-0">
          <p className="mb-6 text-sm font-semibold tracking-[0.08em] text-primary uppercase">
            {messages.heroEyebrow}
          </p>
          <h1 className="max-w-4xl text-5xl leading-[0.98] font-bold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
            {messages.heroTitle}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {messages.heroDescription}
          </p>
          <div className="mt-9">
            <Button asChild size="lg">
              <Link href={`/${locale}/calculators`}>{messages.heroPrimary}</Link>
            </Button>
          </div>
        </div>

        <aside
          aria-labelledby="foundation-title"
          className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[0_20px_60px_-42px_rgba(25,44,34,0.45)] sm:p-8"
        >
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {messages.publicShellLabel}
          </p>
          <h2 id="foundation-title" className="mt-4 text-2xl font-bold tracking-[-0.035em]">
            {messages.trustTitle}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{messages.trustBody}</p>
          <p className="mt-8 border-t border-border pt-5 text-xs font-medium text-muted-foreground">
            {messages.phaseLabel}
          </p>
        </aside>
      </section>

      <section className="border-t border-border bg-card/55">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                {messages.discoveryEyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
                {messages.discoveryTitle}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {messages.discoveryDescription}
              </p>
            </div>

            <div className="min-w-0 divide-y divide-border border-y border-border">
              {referenceCatalog.map((entry, index) => {
                const copy = entry.copy[locale];
                return (
                  <Link
                    key={entry.id}
                    href={`/${locale}/calculators/${entry.slug}`}
                    className="group grid min-w-0 gap-2 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-5"
                  >
                    <span className="text-sm font-semibold text-primary">0{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold tracking-[-0.025em] group-hover:text-primary">
                        {copy.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy.description}</span>
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">↗</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-10">
            <Button asChild variant="outline">
              <Link href={`/${locale}/calculators`}>{messages.discoveryAll}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
