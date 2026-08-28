import { notFound } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { isLocale } from "@/i18n/locales";

export default async function AuthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-18 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1.2fr)] lg:items-start">
      <header className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 04</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          {locale === "id" ? "Akun Found Calc" : "Found Calc account"}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          {locale === "id"
            ? "Kalkulator tetap dapat digunakan tanpa akun. Masuk hanya diperlukan untuk membawa draft tersimpan ke identitas akun Anda."
            : "Calculators remain usable without an account. Sign in only when you want saved drafts attached to your account identity."}
        </p>
      </header>
      <AuthPanel locale={locale} />
    </main>
  );
}
