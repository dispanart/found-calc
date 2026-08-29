"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import {
  cancelBillingSubscription,
  changeBillingSubscription,
  fetchBillingStatus,
  startBillingCheckout,
  type BillingStatusClient,
} from "@/lib/billing/client";

const copy = {
  id: {
    loading: "Memuat status akses…",
    signedOutTitle: "Akses berbayar tetap opsional",
    signedOutBody: "Kalkulator publik tetap bisa digunakan tanpa akun. Masuk hanya jika Anda ingin melihat atau mengelola subscription akun ini.",
    signIn: "Masuk untuk melihat billing",
    unavailableTitle: "Billing belum tersedia",
    unavailableBody: "Konfigurasi plan belum tersedia di server. Tidak ada akses yang berubah dan tidak ada checkout yang dapat dimulai.",
    accessTitle: "Status akses",
    noSubscription: "Belum ada subscription",
    noSubscriptionBody: "Tidak ada plan berbayar yang aktif untuk akun ini.",
    pending: "Menunggu konfirmasi",
    pendingBody: "Checkout sudah dimulai, tetapi Found Calc belum menerima konfirmasi server dari Xendit.",
    active: "Akses aktif",
    activeBody: "Entitlement akun ini berasal dari status subscription yang sudah dikonfirmasi server.",
    pastDue: "Pembayaran perlu perhatian",
    pastDueBody: "Akses berbayar ditahan sampai siklus pembayaran kembali dikonfirmasi berhasil.",
    inactive: "Subscription tidak aktif",
    inactiveBody: "Tidak ada entitlement berbayar yang aktif. Anda dapat memilih plan lagi jika tersedia.",
    cancellationPending: "Pembatalan sudah diminta. Akses tetap mengikuti status server sampai Xendit mengonfirmasi subscription tidak aktif.",
    planTitle: "Plan yang tersedia",
    planIntro: "Harga dan kemampuan di bawah berasal dari konfigurasi server Found Calc, bukan dari kode browser.",
    choose: "Lanjut ke Xendit",
    changePlan: "Ganti plan",
    changing: "Menunggu konfirmasi perubahan plan…",
    perYear: "per tahun",
    freeLabel: "Free · Rp0",
    freeBody: "Kalkulator publik tetap gratis. Billing hanya menambah capability berbayar; tidak mencabut akses calculator gratis.",
    current: "Plan saat ini",
    cancel: "Batalkan subscription",
    cancelling: "Mengirim permintaan pembatalan…",
    opening: "Membuka checkout Xendit…",
    failed: "Billing belum dapat dimuat atau diperbarui. Coba lagi tanpa mengubah data lokal Anda.",
    trustTitle: "Cara aktivasi bekerja",
    trustBody: "Checkout dan pembayaran berlangsung di Xendit. Kembali ke halaman ini tidak mengaktifkan akses. Found Calc baru mengubah entitlement setelah webhook Xendit tervalidasi di server.",
    entitlementTitle: "Entitlement aktif",
    none: "Tidak ada entitlement berbayar aktif.",
    perMonth: "per bulan",
  },
  en: {
    loading: "Loading access status…",
    signedOutTitle: "Paid access remains optional",
    signedOutBody: "Public calculators remain available without an account. Sign in only when you want to inspect or manage this account's subscription.",
    signIn: "Sign in to view billing",
    unavailableTitle: "Billing is not available",
    unavailableBody: "Server-side plan configuration is not available. No access changes and checkout cannot be started.",
    accessTitle: "Access status",
    noSubscription: "No subscription yet",
    noSubscriptionBody: "This account does not have an active paid plan.",
    pending: "Waiting for confirmation",
    pendingBody: "Checkout has started, but Found Calc has not received server confirmation from Xendit yet.",
    active: "Access active",
    activeBody: "This account's entitlements come from subscription state already confirmed by the server.",
    pastDue: "Payment needs attention",
    pastDueBody: "Paid access is withheld until a payment cycle is confirmed successful again.",
    inactive: "Subscription inactive",
    inactiveBody: "No paid entitlement is active. You can choose a plan again when one is available.",
    cancellationPending: "Cancellation has been requested. Access continues to follow server state until Xendit confirms the subscription is inactive.",
    planTitle: "Available plans",
    planIntro: "Prices and capabilities below come from Found Calc server configuration, not browser code.",
    choose: "Continue to Xendit",
    changePlan: "Change plan",
    changing: "Waiting for plan-change confirmation…",
    perYear: "per year",
    freeLabel: "Free · Rp0",
    freeBody: "Public calculators stay free. Billing only adds paid capabilities; it does not remove free calculator access.",
    current: "Current plan",
    cancel: "Cancel subscription",
    cancelling: "Sending cancellation request…",
    opening: "Opening Xendit checkout…",
    failed: "Billing could not be loaded or updated. Try again without changing your local data.",
    trustTitle: "How activation works",
    trustBody: "Checkout and payment happen on Xendit. Returning to this page does not activate access. Found Calc changes entitlements only after a validated Xendit webhook reaches the server.",
    entitlementTitle: "Active entitlements",
    none: "No paid entitlement is active.",
    perMonth: "per month",
  },
} as const;

const stateCopy = (locale: Locale, status: BillingStatusClient) => {
  const text = copy[locale];
  if (status.checkoutPending && !status.subscription) return { title: text.pending, body: text.pendingBody };
  switch (status.subscription?.status) {
    case "pending": return { title: text.pending, body: text.pendingBody };
    case "active": return { title: text.active, body: text.activeBody };
    case "past_due": return { title: text.pastDue, body: text.pastDueBody };
    case "inactive": return { title: text.inactive, body: text.inactiveBody };
    default: return { title: text.noSubscription, body: text.noSubscriptionBody };
  }
};

export function BillingPanel({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const { data: session, isPending } = authClient.useSession();
  const [billing, setBilling] = useState<BillingStatusClient | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session?.user.id) return;
    const controller = new AbortController();
    fetchBillingStatus(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setBilling(next);
        setStatusMessage("");
      })
      .catch(() => { if (!controller.signal.aborted) setStatusMessage(text.failed); });
    return () => controller.abort();
  }, [session?.user.id, refreshKey, text.failed]);

  const money = useMemo(() => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }), [locale]);

  if (isPending) return <p role="status" className="text-sm text-muted-foreground">{text.loading}</p>;
  if (!session?.user) return (
    <section className="border-y border-border py-7">
      <h2 className="text-2xl font-bold tracking-[-0.03em]">{text.signedOutTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{text.signedOutBody}</p>
      <Link href={`/${locale}/auth`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-semibold text-primary-foreground">{text.signIn}</Link>
    </section>
  );

  if (!billing && !statusMessage) return <p role="status" className="text-sm text-muted-foreground">{text.loading}</p>;
  if (!billing) return <p role="status" className="border-y border-border py-6 text-sm text-muted-foreground">{statusMessage}</p>;
  if (!billing.available) return (
    <section className="border-y border-border py-7" data-testid="billing-unavailable">
      <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Server configuration</p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{text.unavailableTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{text.unavailableBody}</p>
    </section>
  );

  const current = stateCopy(locale, billing);
  const subscriptionBlocksCheckout = Boolean(billing.checkoutPending);
  const currentPlan = billing.subscription ? billing.plans.find((plan) => plan.id === billing.subscription?.planId) : undefined;

  const beginPlanAction = async (planId: string) => {
    setBusyPlan(planId);
    const changing = Boolean(billing.subscription && billing.subscription.status === "active" && billing.subscription.planId !== planId);
    setStatusMessage(changing ? text.changing : text.opening);
    try {
      if (changing) {
        await changeBillingSubscription(planId);
        setRefreshKey((value) => value + 1);
        setBusyPlan(null);
      } else {
        const url = await startBillingCheckout(planId, locale);
        window.location.assign(url);
      }
    } catch {
      setStatusMessage(text.failed); setBusyPlan(null);
    }
  };
  const cancel = async () => {
    setCancelling(true); setStatusMessage(text.cancelling);
    try {
      await cancelBillingSubscription();
      setRefreshKey((value) => value + 1);
    } catch { setStatusMessage(text.failed); }
    finally { setCancelling(false); }
  };

  return (
    <div className="min-w-0 space-y-10" data-testid="billing-panel">
      <section className="grid min-w-0 gap-6 border-y border-border py-7 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)]">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{text.accessTitle}</p>
          <h2 className="mt-2 break-words text-3xl font-bold tracking-[-0.04em]">{current.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{current.body}</p>
          {currentPlan ? <p className="mt-4 text-sm font-semibold">{currentPlan.displayName[locale]}</p> : null}
          {billing.subscription?.pendingPlanId ? <p className="mt-2 text-sm text-muted-foreground">{text.changing}</p> : null}
          {billing.subscription?.cancellationPending ? <p className="mt-4 max-w-2xl border-l-2 border-primary pl-4 text-sm leading-6">{text.cancellationPending}</p> : null}
          {billing.subscription && billing.subscription.status !== "inactive" && !billing.subscription.cancellationPending ? (
            <Button className="mt-5" type="button" variant="outline" disabled={cancelling} onClick={cancel}>{text.cancel}</Button>
          ) : null}
        </div>
        <div className="min-w-0 md:border-l md:border-border md:pl-6">
          <h3 className="text-sm font-bold">{text.entitlementTitle}</h3>
          {billing.entitlements.length ? (
            <ul className="mt-3 space-y-2 text-sm" data-testid="billing-entitlements">
              {billing.entitlements.map((key) => <li key={key} className="break-words font-mono text-xs">{key}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">{text.none}</p>}
        </div>
      </section>

      <section aria-labelledby="billing-plan-title">
        <h2 id="billing-plan-title" className="text-2xl font-bold tracking-[-0.03em]">{text.planTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text.planIntro}</p>
        <div className="mt-5 divide-y divide-border border-y border-border">
          <article className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{text.freeLabel}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{text.freeBody}</p>
            </div>
          </article>
          {billing.plans.map((plan) => {
            const isCurrent = billing.subscription?.planId === plan.id && billing.subscription.status !== "inactive";
            return (
              <article key={plan.id} className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="break-words text-lg font-bold">{plan.displayName[locale]}</h3>
                    {isCurrent ? <span className="text-xs font-semibold text-primary">{text.current}</span> : null}
                  </div>
                  <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-muted-foreground">{plan.description[locale]}</p>
                  <p className="mt-3 text-sm font-semibold">{money.format(plan.amount)} <span className="font-normal text-muted-foreground">{plan.intervalCount === 12 ? text.perYear : text.perMonth}</span></p>
                </div>
                <Button type="button" disabled={isCurrent || subscriptionBlocksCheckout || busyPlan !== null || Boolean(billing.subscription?.cancellationPending) || Boolean(billing.subscription?.pendingPlanId)} onClick={() => beginPlanAction(plan.id)}>{billing.subscription?.status === "active" ? text.changePlan : text.choose}</Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-l-2 border-primary/40 pl-4" aria-labelledby="billing-trust-title">
        <h2 id="billing-trust-title" className="text-base font-bold">{text.trustTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{text.trustBody}</p>
      </section>

      <p className="min-h-6 break-words text-sm text-muted-foreground" role="status" aria-live="polite">{statusMessage}</p>
    </div>
  );
}
