"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import type { SupportedCalculatorId } from "@/lib/persistence/state";

const calculatorIds: readonly SupportedCalculatorId[] = [
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
];

type StateStatus = "checking" | "saved" | "missing" | "unavailable";

const labels = {
  id: {
    heading: "Draft tersimpan",
    signedOut: "Masuk untuk melihat draft yang tersimpan pada akun Anda.",
    authLink: "Masuk",
    checking: "Memeriksa…",
    saved: "Tersimpan",
    missing: "Belum tersimpan",
    unavailable: "Tidak tersedia",
    retry: "Periksa lagi",
    names: {
      "reference.discount": "Kalkulator Diskon Bertingkat",
      "reference.business-margin": "Kalkulator Margin Bisnis",
      "reference.synthetic-rule": "Referensi Aturan Versi",
    },
  },
  en: {
    heading: "Saved drafts",
    signedOut: "Sign in to see drafts saved to your account.",
    authLink: "Sign in",
    checking: "Checking…",
    saved: "Saved",
    missing: "Not saved",
    unavailable: "Unavailable",
    retry: "Check again",
    names: {
      "reference.discount": "Stacked Discount Calculator",
      "reference.business-margin": "Business Margin Calculator",
      "reference.synthetic-rule": "Versioned Rule Reference",
    },
  },
} as const;

const initialStatuses = (): Record<SupportedCalculatorId, StateStatus> => ({
  "reference.discount": "checking",
  "reference.business-margin": "checking",
  "reference.synthetic-rule": "checking",
});

interface SignedInPersistenceSummaryProps {
  locale: Locale;
  userId: string;
}

function SignedInPersistenceSummary({ locale, userId }: SignedInPersistenceSummaryProps) {
  const text = labels[locale];
  const [statuses, setStatuses] = useState<Record<SupportedCalculatorId, StateStatus>>(initialStatuses);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const entries = await Promise.all(calculatorIds.map(async (calculatorId) => {
        try {
          const response = await fetch(`/api/calculator-state/${encodeURIComponent(calculatorId)}`, { cache: "no-store" });
          if (response.ok) return [calculatorId, "saved"] as const;
          if (response.status === 404) return [calculatorId, "missing"] as const;
          return [calculatorId, "unavailable"] as const;
        } catch {
          return [calculatorId, "unavailable"] as const;
        }
      }));
      if (!active) return;
      setStatuses(Object.fromEntries(entries) as Record<SupportedCalculatorId, StateStatus>);
    };

    void load();
    return () => { active = false; };
  }, [refreshKey, userId]);

  const refresh = () => {
    setStatuses(initialStatuses());
    setRefreshKey((value) => value + 1);
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-[-0.025em]">{text.heading}</h2>
        </div>
        <Button type="button" variant="outline" onClick={refresh}>{text.retry}</Button>
      </div>
      <dl className="mt-6 grid gap-3">
        {calculatorIds.map((calculatorId) => (
          <div key={calculatorId} className="grid min-w-0 gap-1 rounded-[var(--radius-control)] border border-border/70 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <dt className="min-w-0 break-words text-sm font-semibold">{text.names[calculatorId]}</dt>
            <dd className="text-sm text-muted-foreground" data-testid={`workspace-state-${calculatorId}`} role="status">
              {text[statuses[calculatorId]]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PersistenceSummary({ locale }: { locale: Locale }) {
  const text = labels[locale];
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <p className="text-sm text-muted-foreground" role="status">{text.checking}</p>;
  }

  if (!session?.user) {
    return (
      <section className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-bold tracking-[-0.025em]">{text.heading}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{text.signedOut}</p>
        <Link href={`/${locale}/auth`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {text.authLink}
        </Link>
      </section>
    );
  }

  return (
    <SignedInPersistenceSummary
      key={session.user.id}
      locale={locale}
      userId={session.user.id}
    />
  );
}
