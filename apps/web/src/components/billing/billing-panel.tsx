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
  startBestiesTrial,
  startBillingCheckout,
  type BillingStatusClient,
} from "@/lib/billing/client";

const copy = {
  id: {
    loading: "Memuat status akses…",
    signedOutTitle: "Akses berbayar tetap opsional",
    signedOutBody: "Semua kalkulator publik tetap gratis. Masuk hanya jika Anda ingin mengaktifkan trial Besties atau mengelola subscription akun ini.",
    signIn: "Masuk untuk mengelola akses",
    unavailableTitle: "Billing belum tersedia",
    unavailableBody: "Konfigurasi plan belum tersedia di server. Tidak ada akses yang berubah dan tidak ada checkout yang dapat dimulai.",
    accessTitle: "Status akses",
    friends: "Friends",
    friendsBody: "Semua kalkulator tetap gratis. Akun ini sedang memakai batas Friends untuk penyimpanan dan workspace.",
    pending: "Menunggu konfirmasi",
    pendingBody: "Checkout sudah dimulai, tetapi Found Calc belum menerima konfirmasi server dari Xendit.",
    active: "Akses aktif",
    activeBody: "Akses berbayar akun ini berasal dari state first-party yang sudah dikonfirmasi server.",
    trialActive: "Besties trial aktif",
    trialActiveBody: "Akses Besties trial dihitung dari waktu server dan tidak bergantung pada jam browser.",
    pastDue: "Pembayaran perlu perhatian",
    pastDueBody: "Akses berbayar ditahan sampai siklus pembayaran kembali dikonfirmasi berhasil.",
    inactive: "Subscription tidak aktif",
    inactiveBody: "Renewal tidak aktif dan tidak ada paid-through access yang tersisa. Akun kembali ke Friends kecuali entitlement lain berlaku.",
    cancellationPending: "Pembatalan sudah diminta. Renewal berhenti, tetapi akses yang sudah dibayar tetap berlaku sampai paid-through date yang authoritative. Data Anda tidak dihapus.",
    paidThrough: "Akses dibayar sampai",
    planTitle: "Plan yang tersedia",
    planIntro: "Checkout memakai current offer yang dikonfigurasi server. Provider ID historis tetap dipertahankan untuk reconciliation.",
    choose: "Lanjut ke Xendit",
    changePlan: "Ganti plan",
    changing: "Menunggu konfirmasi perubahan plan…",
    perYear: "per tahun",
    freeLabel: "Friends · Rp0",
    freeBody: "Semua kalkulator dan hasil utama tetap gratis, dengan maksimal 5 Saved Calculations, 1 Goal aktif, dan 1 Project aktif.",
    current: "Plan saat ini",
    cancel: "Batalkan subscription",
    cancelling: "Mengirim permintaan pembatalan…",
    opening: "Membuka checkout Xendit…",
    failed: "Billing belum dapat dimuat atau diperbarui. Coba lagi tanpa mengubah data lokal Anda.",
    trustTitle: "Cara aktivasi bekerja",
    trustBody: "Checkout dan pembayaran berlangsung di Xendit. Kembali ke halaman ini tidak mengaktifkan akses. Found Calc baru mengubah paid entitlement setelah webhook Xendit tervalidasi di server.",
    entitlementTitle: "Entitlement aktif",
    none: "Tidak ada entitlement berbayar aktif.",
    perMonth: "per bulan",
    trialTitle: "Besties gratis 14 hari",
    trialEligible: "Akun ini eligible untuk satu kali Besties trial selama tepat 14 × 24 jam. Tanpa kartu dan tanpa membuat subscription Xendit.",
    trialConsumed: "Trial Besties untuk akun ini sudah pernah digunakan atau tidak lagi eligible. Trial tidak dapat diulang dengan login ulang atau mengganti metode autentikasi.",
    startTrial: "Mulai trial Besties 14 hari",
    startingTrial: "Mengaktifkan trial Besties…",
    trialEnds: "Trial berakhir",
    trialNote: "Trial hanya dimulai saat Anda menekan tombol ini; tidak dimulai otomatis saat membuat akun.",
  },
  en: {
    loading: "Loading access status…",
    signedOutTitle: "Paid access remains optional",
    signedOutBody: "All public calculators remain free. Sign in only when you want to activate the Besties trial or manage this account's subscription.",
    signIn: "Sign in to manage access",
    unavailableTitle: "Billing is not available",
    unavailableBody: "Server-side plan configuration is not available. No access changes and checkout cannot be started.",
    accessTitle: "Access status",
    friends: "Friends",
    friendsBody: "All calculators remain free. This account is currently using Friends persistence and workspace limits.",
    pending: "Waiting for confirmation",
    pendingBody: "Checkout has started, but Found Calc has not received server confirmation from Xendit yet.",
    active: "Access active",
    activeBody: "This account's paid access comes from first-party state already confirmed by the server.",
    trialActive: "Besties trial active",
    trialActiveBody: "Besties trial access is derived from server time and never depends on the browser clock.",
    pastDue: "Payment needs attention",
    pastDueBody: "Paid access is withheld until a payment cycle is confirmed successful again.",
    inactive: "Subscription inactive",
    inactiveBody: "Renewal is inactive and no paid-through access remains. The account returns to Friends unless another entitlement applies.",
    cancellationPending: "Cancellation has been requested. Renewal stops, while already-paid access remains available through the authoritative paid-through date. Your data is not deleted.",
    paidThrough: "Paid access through",
    planTitle: "Available plans",
    planIntro: "Checkout uses current offers configured by the server. Historical provider IDs remain preserved for reconciliation.",
    choose: "Continue to Xendit",
    changePlan: "Change plan",
    changing: "Waiting for plan-change confirmation…",
    perYear: "per year",
    freeLabel: "Friends · Rp0",
    freeBody: "All calculators and primary results stay free, with up to 5 Saved Calculations, 1 active Goal, and 1 active Project.",
    current: "Current plan",
    cancel: "Cancel subscription",
    cancelling: "Sending cancellation request…",
    opening: "Opening Xendit checkout…",
    failed: "Billing could not be loaded or updated. Try again without changing your local data.",
    trustTitle: "How activation works",
    trustBody: "Checkout and payment happen on Xendit. Returning to this page does not activate access. Found Calc changes paid entitlement only after a validated Xendit webhook reaches the server.",
    entitlementTitle: "Active entitlements",
    none: "No paid entitlement is active.",
    perMonth: "per month",
    trialTitle: "Besties free for 14 days",
    trialEligible: "This account is eligible for one Besties trial lasting exactly 14 × 24 hours. No card and no Xendit subscription is created.",
    trialConsumed: "The Besties trial for this account has already been consumed or is no longer eligible. It cannot be restarted by signing in again or changing authentication method.",
    startTrial: "Start 14-day Besties trial",
    startingTrial: "Activating Besties trial…",
    trialEnds: "Trial ends",
    trialNote: "The trial starts only when you press this button; it never starts automatically when you create an account.",
  },
} as const;

const stateCopy = (locale: Locale, status: BillingStatusClient) => {
  const text = copy[locale];
  if (status.commercial?.source === "trial") return { title: text.trialActive, body: text.trialActiveBody };
  if (status.commercial?.source === "paid") return { title: text.active, body: text.activeBody };
  if (status.checkoutPending && !status.subscription) return { title: text.pending, body: text.pendingBody };
  switch (status.subscription?.status) {
    case "pending": return { title: text.pending, body: text.pendingBody };
    case "active": return { title: text.active, body: text.activeBody };
    case "past_due": return { title: text.pastDue, body: text.pastDueBody };
    case "inactive": return { title: text.inactive, body: text.inactiveBody };
    default: return { title: text.friends, body: text.friendsBody };
  }
};

export function BillingPanel({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const { data: session, isPending } = authClient.useSession();
  const [billing, setBilling] = useState<BillingStatusClient | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
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
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }), [locale]);

  if (isPending) return <p role="status" className="text-sm text-muted-foreground">{text.loading}</p>;
  if (!session?.user) return (
    <section className="border-y border-border py-7">
      <h2 className="text-2xl font-bold tracking-[-0.03em]">{text.signedOutTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{text.signedOutBody}</p>
      <Link href={`/${locale}/auth?returnTo=${encodeURIComponent(`/${locale}/workspace/billing`)}`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-semibold text-primary-foreground">{text.signIn}</Link>
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
  const trialActive = billing.commercial?.source === "trial";
  const trialEligible = billing.trial?.eligible === true && !trialActive && billing.commercial?.source !== "paid";

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

  const beginTrial = async () => {
    setStartingTrial(true);
    setStatusMessage(text.startingTrial);
    try {
      await startBestiesTrial();
      setRefreshKey((value) => value + 1);
    } catch {
      setStatusMessage(text.failed);
    } finally {
      setStartingTrial(false);
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
          {billing.subscription?.paidThroughAt ? <p className="mt-3 text-sm text-muted-foreground">{text.paidThrough}: {dateTime.format(new Date(billing.subscription.paidThroughAt))}</p> : null}
          {billing.subscription && billing.subscription.status !== "inactive" && !billing.subscription.cancellationPending ? (
            <Button className="mt-5" type="button" variant="outline" disabled={cancelling} onClick={cancel}>{text.cancel}</Button>
          ) : null}
        </div>
        <div className="min-w-0 md:border-l md:border-border md:pl-6">
          <h3 className="text-sm font-bold">{text.entitlementTitle}</h3>
          {billing.commercial ? <p className="mt-3 text-sm font-semibold capitalize">{billing.commercial.tier} · {billing.commercial.source}</p> : null}
          {billing.entitlements.length ? (
            <ul className="mt-3 space-y-2 text-sm" data-testid="billing-entitlements">
              {billing.entitlements.map((key) => <li key={key} className="break-words font-mono text-xs">{key}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">{text.none}</p>}
        </div>
      </section>

      <section aria-labelledby="billing-trial-title" className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-7">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Besties</p>
        <h2 id="billing-trial-title" className="mt-2 text-2xl font-bold tracking-[-0.03em]">{text.trialTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{trialEligible ? text.trialEligible : trialActive ? text.trialActiveBody : text.trialConsumed}</p>
        {trialActive && billing.trial?.endsAt ? <p className="mt-3 text-sm font-semibold">{text.trialEnds}: {dateTime.format(new Date(billing.trial.endsAt))}</p> : null}
        {trialEligible ? <Button className="mt-5" type="button" disabled={startingTrial} onClick={beginTrial}>{startingTrial ? text.startingTrial : text.startTrial}</Button> : null}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.trialNote}</p>
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
            const isCurrent = billing.subscription?.planId === plan.id && billing.commercial?.source === "paid";
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
                <Button type="button" disabled={isCurrent || subscriptionBlocksCheckout || busyPlan !== null || Boolean(billing.subscription?.cancellationPending) || Boolean(billing.subscription?.pendingPlanId)} onClick={() => beginPlanAction(plan.id)}>{billing.commercial?.source === "paid" ? text.changePlan : text.choose}</Button>
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
