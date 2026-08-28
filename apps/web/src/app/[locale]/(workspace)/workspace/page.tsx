import { notFound } from "next/navigation";

import { PersistenceSummary } from "@/components/workspace/persistence-summary";
import { isLocale } from "@/i18n/locales";

export default async function WorkspacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-18">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 04</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          {locale === "id" ? "Ruang kerja Found Calc" : "Found Calc workspace"}
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {locale === "id"
            ? "Lihat apakah tiga kalkulator referensi memiliki draft tersimpan pada akun ini. Kalkulasi tetap dilakukan di perangkat Anda."
            : "See whether the three reference calculators have a draft saved to this account. Calculation still happens on your device."}
        </p>
      </header>
      <div className="mt-10">
        <PersistenceSummary locale={locale} />
      </div>
    </main>
  );
}
