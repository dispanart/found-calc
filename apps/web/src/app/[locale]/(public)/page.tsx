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
        <div>
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
              <a href="#foundation">{messages.heroPrimary}</a>
            </Button>
          </div>
        </div>

        <aside
          id="foundation"
          aria-labelledby="foundation-title"
          className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[0_20px_60px_-42px_rgba(25,44,34,0.45)] sm:p-8"
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
    </main>
  );
}
