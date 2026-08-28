"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { FoundationMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locales";

interface SiteHeaderProps {
  locale: Locale;
  messages: FoundationMessages;
}

export function SiteHeader({ locale, messages }: SiteHeaderProps) {
  const pathname = usePathname();
  const otherLocale: Locale = locale === "id" ? "en" : "id";
  const primaryNavigationLabel = locale === "id" ? "Navigasi utama" : "Primary navigation";
  const localeHref = (pathname.replace(/^\/(id|en)(?=\/|$)/, `/${otherLocale}`) || `/${otherLocale}`) as Route;

  return (
    <header className="border-b border-border/80 bg-background/95">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href={`/${locale}`}
          className="rounded-sm text-lg font-bold tracking-[-0.035em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {messages.brand}
        </Link>

        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <nav aria-label={primaryNavigationLabel} className="hidden items-center gap-5 text-sm md:flex">
            <Link className="rounded-sm text-muted-foreground hover:text-foreground" href={`/${locale}`}>
              {messages.navHome}
            </Link>
            <Link className="rounded-sm text-muted-foreground hover:text-foreground" href={`/${locale}/calculators`}>
              {messages.navCalculators}
            </Link>
            <Link className="rounded-sm text-muted-foreground hover:text-foreground" href={`/${locale}/workspace`}>
              {messages.navWorkspace}
            </Link>
            <Link className="rounded-sm text-muted-foreground hover:text-foreground" href={`/${locale}/admin`}>
              {messages.navAdmin}
            </Link>
          </nav>

          <Link
            className="rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground"
            href={`/${locale}/auth`}
          >
            {messages.navAccount}
          </Link>

          <Link
            href={localeHref}
            aria-label={`${messages.localeSwitchLabel}: ${otherLocale.toUpperCase()}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold uppercase hover:bg-muted"
          >
            {otherLocale}
          </Link>
        </div>
      </div>
    </header>
  );
}