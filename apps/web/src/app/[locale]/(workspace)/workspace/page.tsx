import { notFound } from "next/navigation";

import { getMessages } from "@/i18n/messages";
import { isLocale } from "@/i18n/locales";

export default async function WorkspaceShellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-sm font-semibold text-primary">{messages.phaseLabel}</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{messages.workspaceTitle}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{messages.workspaceBody}</p>
    </main>
  );
}
