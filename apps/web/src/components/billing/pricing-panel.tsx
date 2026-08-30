import Link from "next/link";

import type { Locale } from "@/i18n/locales";
import { commercialLimitsFor, publicPlanName } from "@/lib/billing/commercial";
import type { CommercialLimits } from "@/lib/billing/contracts";

const copy = {
  id: {
    eyebrow: "Pricing Found Calc",
    hero: "Semua kalkulator tetap gratis. Upgrade ketika Anda membutuhkan lebih.",
    intro: "Friends menjaga perhitungan tetap terbuka. Besties menambah kedalaman untuk merencanakan. Family menambah skala operasional untuk banyak produk, channel, atau bisnis.",
    friendsRole: "Calculate",
    bestiesRole: "Plan",
    familyRole: "Operate",
    free: "Rp0",
    monthly: "bulan",
    yearly: "tahun",
    friendsFeatures: (limits: CommercialLimits) => [
      "Semua kalkulator publik dan hasil utama",
      `Maksimal ${limits.savedCalculations} Saved Calculations`,
      `History ${limits.historyDays} hari`,
      `${limits.activeGoals} Goal aktif dan ${limits.activeProjects} Project aktif`,
      `Entitlement widget untuk ${limits.widgetDomains} domain terverifikasi dengan Powered by Found Calc`,
    ],
    bestiesFeatures: (limits: CommercialLimits) => [
      "Saved Calculations, History, Goals, dan personal Projects tanpa batas plan",
      "Perbandingan skenario, sensitivity, dan deterministic recommendations lanjutan",
      "Export PDF/CSV ketika tersedia pada workflow terkait",
      `Entitlement widget hingga ${limits.widgetDomains} domain, theme customization, dan standard analytics`,
    ],
    familyFeatures: (limits: CommercialLimits) => [
      "Portfolio entitlement untuk operating view lintas banyak entitas",
      "Bulk SKU, CSV import, multi-marketplace/store, dan campaign portfolio entitlement",
      `${limits.teamSeats} seats untuk team capability awal`,
      `Entitlement widget ${limits.widgetDomains}+ domain, white-label, dan advanced analytics/events`,
    ],
    startFree: "Mulai menghitung",
    trial: "Coba Besties gratis 14 hari",
    familyCta: "Kelola Family",
    trialNote: "Tanpa kartu. Aktivasi manual setelah masuk; trial tidak dimulai otomatis saat membuat akun.",
    futureTitle: "Entitlement sekarang, runtime berikutnya",
    futureBody: "Entitlement widget sudah ditetapkan; runtime Widget Platform belum tersedia di Phase 07A. Portfolio Family juga merupakan entitlement/availability contract sampai runtime Portfolio diimplementasikan.",
    trustTitle: "Upgrade tidak mengambil kepemilikan data Anda",
    trustBody: "Cancel menghentikan renewal, bukan menghapus data atau otomatis melakukan refund. Akses berbayar yang sudah dibayar tetap berlaku sampai paid-through date yang authoritative. Setelah downgrade atau trial berakhir, Saved Calculations, Goals, Projects, dan Profile tetap dimiliki dan dapat dibaca; hanya creation/activation di atas batas Friends yang diblokir.",
    annualHint: "Harga tahunan ditampilkan berdampingan; paket bulanan tetap dapat dipilih.",
  },
  en: {
    eyebrow: "Found Calc pricing",
    hero: "Calculate for free. Upgrade when you need more.",
    intro: "Friends keeps calculation open. Besties adds depth for planning. Family adds operating scale across products, channels, or businesses.",
    friendsRole: "Calculate",
    bestiesRole: "Plan",
    familyRole: "Operate",
    free: "Rp0",
    monthly: "month",
    yearly: "year",
    friendsFeatures: (limits: CommercialLimits) => [
      "All public calculators and primary results",
      `Up to ${limits.savedCalculations} Saved Calculations`,
      `${limits.historyDays}-day History`,
      `${limits.activeGoals} active Goal and ${limits.activeProjects} active Project`,
      `Widget entitlement for ${limits.widgetDomains} verified domain with Powered by Found Calc`,
    ],
    bestiesFeatures: (limits: CommercialLimits) => [
      "Unlimited plan access for Saved Calculations, History, Goals, and personal Projects",
      "Advanced scenario comparison, sensitivity, and deterministic recommendations",
      "PDF/CSV export where supported by the relevant workflow",
      `Widget entitlement for up to ${limits.widgetDomains} domains, theme customization, and standard analytics`,
    ],
    familyFeatures: (limits: CommercialLimits) => [
      "Portfolio entitlement for operating views across many entities",
      "Bulk SKU, CSV import, multi-marketplace/store, and campaign portfolio entitlements",
      `${limits.teamSeats} seats for the initial team capability`,
      `Widget entitlement for ${limits.widgetDomains}+ domains, white-label, and advanced analytics/events`,
    ],
    startFree: "Start calculating",
    trial: "Try Besties free for 14 days",
    familyCta: "Manage Family",
    trialNote: "No card. Activate manually after sign-in; the trial never starts automatically at account creation.",
    futureTitle: "Entitlement now, runtime later",
    futureBody: "Widget entitlements are defined, but the Widget Platform runtime is not yet available in Phase 07A. Family Portfolio is also an entitlement/availability contract until the Portfolio runtime is implemented.",
    trustTitle: "Upgrading never takes ownership of your data",
    trustBody: "Cancel stops renewal; it does not delete data or automatically refund a payment. Already-paid access remains effective through the authoritative paid-through date. After downgrade or trial expiry, Saved Calculations, Goals, Projects, and Profile remain owned and readable; only creation/activation above Friends limits is blocked.",
    annualHint: "Annual pricing is shown alongside monthly pricing; monthly remains easy to choose.",
  },
} as const;

const planCards = (locale: Locale) => {
  const text = copy[locale];
  const friendsLimits = commercialLimitsFor("friends");
  const bestiesLimits = commercialLimitsFor("besties");
  const familyLimits = commercialLimitsFor("family");
  return [
    {
      name: publicPlanName("friends"),
      role: text.friendsRole,
      price: text.free,
      cadence: null,
      features: text.friendsFeatures(friendsLimits),
      cta: text.startFree,
      href: `/${locale}/calculators`,
      emphasis: false,
    },
    {
      name: publicPlanName("besties"),
      role: text.bestiesRole,
      price: "Rp24.900",
      cadence: `/${text.monthly} · Rp199.000/${text.yearly}`,
      features: text.bestiesFeatures(bestiesLimits),
      cta: text.trial,
      href: `/${locale}/auth?returnTo=${encodeURIComponent(`/${locale}/workspace/billing`)}`,
      emphasis: true,
    },
    {
      name: publicPlanName("family"),
      role: text.familyRole,
      price: "Rp59.000",
      cadence: `/${text.monthly} · Rp499.000/${text.yearly}`,
      features: text.familyFeatures(familyLimits),
      cta: text.familyCta,
      href: `/${locale}/auth?returnTo=${encodeURIComponent(`/${locale}/workspace/billing`)}`,
      emphasis: false,
    },
  ] as const;
};

export function PricingPanel({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const plans = planCards(locale);

  return (
    <div className="min-w-0">
      <header className="max-w-4xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{text.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.055em] text-balance sm:text-6xl">{text.hero}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{text.intro}</p>
      </header>

      <section className="mt-12 grid min-w-0 gap-5 lg:grid-cols-3" aria-label={locale === "id" ? "Pilihan plan" : "Plan choices"}>
        {plans.map((plan) => (
          <article key={plan.name} className={`min-w-0 rounded-[var(--radius-card)] border p-6 sm:p-7 ${plan.emphasis ? "border-primary bg-card shadow-sm" : "border-border bg-card"}`}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{plan.role}</p>
                <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.04em]">{plan.name}</h2>
              </div>
              {plan.emphasis ? <span className="shrink-0 rounded-full border border-primary/40 px-2.5 py-1 text-[0.68rem] font-semibold text-primary">{locale === "id" ? "Paling populer" : "Most popular"}</span> : null}
            </div>
            <p className="mt-6 break-words text-3xl font-bold tracking-[-0.045em]">
              {plan.price}
              {plan.cadence ? <span className="ml-1 text-sm font-medium tracking-normal text-muted-foreground">{plan.cadence}</span> : null}
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              {plan.features.map((feature) => <li key={feature} className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0">{feature}</li>)}
            </ul>
            <Link href={plan.href} className={`mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] px-4 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${plan.emphasis ? "bg-primary text-primary-foreground" : "border border-border bg-background hover:bg-muted"}`}>
              {plan.cta}
            </Link>
            {plan.name === publicPlanName("besties") ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.trialNote}</p> : null}
          </article>
        ))}
      </section>

      <p className="mt-5 text-sm text-muted-foreground">{text.annualHint}</p>

      <section className="mt-12 grid gap-6 border-y border-border py-8 md:grid-cols-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-[-0.03em]">{text.futureTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{text.futureBody}</p>
        </div>
        <div className="min-w-0 md:border-l md:border-border md:pl-6">
          <h2 className="text-xl font-bold tracking-[-0.03em]">{text.trustTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{text.trustBody}</p>
        </div>
      </section>
    </div>
  );
}
