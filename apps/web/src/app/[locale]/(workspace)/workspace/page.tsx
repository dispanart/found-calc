import { notFound } from "next/navigation";

import { WorkspaceDashboard } from "@/components/workspace/workspace-dashboard";
import { isLocale } from "@/i18n/locales";

export default async function WorkspacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-18">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Phase 06</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
          {locale === "id" ? "Ruang kerja Found Calc" : "Found Calc workspace"}
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {locale === "id"
            ? "Atur Goal privat, Project, kolaborator, dan riwayat perhitungan bernama tanpa memindahkan kalkulasi ke server. Draft terbaru tetap menjadi fitur terpisah."
            : "Organize private Goals, Projects, collaborators, and named calculation history without moving calculation execution to the server. Latest drafts remain a separate feature."}
        </p>
      </header>
      <div className="mt-10"><WorkspaceDashboard locale={locale} /></div>
    </main>
  );
}
