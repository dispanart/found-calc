import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getMessages } from "@/i18n/messages";
import { isLocale, locales } from "@/i18n/locales";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <div lang={locale} className="min-h-[100dvh]">
      <SiteHeader locale={locale} messages={messages} />
      {children}
    </div>
  );
}
