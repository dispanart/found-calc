import { notFound } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { RuleAdminPanel } from "@/components/admin/rule-admin-panel";
import { getMessages } from "@/i18n/messages";
import { isLocale } from "@/i18n/locales";

export default async function AdminShellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-sm font-semibold text-primary">{messages.phaseLabel}</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{messages.adminTitle}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{messages.adminBody}</p>
      <div className="mt-8"><AuthPanel locale={locale} returnTo={`/${locale}/admin`} /></div>
      <RuleAdminPanel locale={locale} />
    </main>
  );
}