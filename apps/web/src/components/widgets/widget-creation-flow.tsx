"use client";

import { calculatorCatalog, getCalculatorById } from "@found-calc/catalog";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import type { CommercialAccessClient } from "@/lib/billing/client";
import { createWidget, createWidgetDomain, verifyWidgetDomain, type WidgetClient, type WidgetDomainClient, type WidgetVerificationClient } from "@/lib/widgets/client";
import type { SupportedCalculatorId, WidgetDefaultConfiguration } from "@/lib/widgets/defaults";

const APPROVED_STEPS = ["Choose calculator", "Select locale", "Add or choose domain", "Verify domain", "Appearance", "Safe defaults", "Preview", "Copy embed code"] as const;
const DEFAULT_THEME = { appearance: "system", accent: "brand", density: "comfortable", radiusPreset: "standard", showTitle: true } as const;
const WIDGET_SAFE_CALCULATOR_IDS: readonly SupportedCalculatorId[] = [
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
  "quick.percentage",
  "quick.date-difference",
  "quick.length-conversion",
];
const LENGTH_UNITS = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] as const;
type LengthUnitOption = (typeof LENGTH_UNITS)[number];

const widgetCalculators = calculatorCatalog.filter((entry) =>
  entry.widgetSafe && WIDGET_SAFE_CALCULATOR_IDS.includes(entry.id as SupportedCalculatorId));
const controlClass = "mt-2 min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-card px-3";

const parseDiscountPercentages = (value: string): readonly string[] =>
  value.split(",").map((entry) => entry.trim()).filter(Boolean);

export function WidgetCreationFlow({ locale, access, initialDomains, embedOrigin, onCreated, onDomainAdded, onCancel }: {
  readonly locale: Locale;
  readonly access: CommercialAccessClient;
  readonly initialDomains: readonly WidgetDomainClient[];
  readonly embedOrigin: string;
  readonly onCreated: (widget: WidgetClient) => void;
  readonly onDomainAdded: (domain: WidgetDomainClient) => void;
  readonly onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [calculatorId, setCalculatorId] = useState<SupportedCalculatorId>("reference.discount");
  const [widgetLocale, setWidgetLocale] = useState<"id" | "en">(locale);
  const [domains, setDomains] = useState<readonly WidgetDomainClient[]>(initialDomains);
  const [domainOrigin, setDomainOrigin] = useState("");
  const [domainId, setDomainId] = useState(initialDomains.find((domain) => domain.status === "active")?.id ?? "");
  const [verification, setVerification] = useState<WidgetVerificationClient | null>(null);
  const [appearance, setAppearance] = useState<"light" | "dark" | "system">("system");
  const [accent, setAccent] = useState<"brand" | "blue" | "teal">("brand");
  const [removeBranding, setRemoveBranding] = useState(false);

  const [baseAmount, setBaseAmount] = useState("");
  const [discountPercentages, setDiscountPercentages] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [variableSellingCostPerOrder, setVariableSellingCostPerOrder] = useState("");
  const [baseValue, setBaseValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [value, setValue] = useState("");
  const [fromUnit, setFromUnit] = useState<LengthUnitOption>("m");
  const [toUnit, setToUnit] = useState<LengthUnitOption>("cm");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [created, setCreated] = useState<WidgetClient | null>(null);
  const canCustomize = access.limits.widgetCustomization;
  const canRemoveBranding = access.limits.removeWidgetBranding;
  const selectedDomain = domains.find((domain) => domain.id === domainId);
  const calculator = getCalculatorById(calculatorId);
  const title = calculator?.copy[widgetLocale].title ?? "Found Calc calculator";
  const snippet = created && selectedDomain?.verifiedAt !== null && selectedDomain?.status === "active"
    ? `<script defer src="${embedOrigin}/embed.js"></script>\n<div data-foundcalc-widget="${created.publicWidgetKey}" data-foundcalc-title="${title}"></div>`
    : "";

  const defaults = useMemo<WidgetDefaultConfiguration>(() => {
    if (calculatorId === "reference.discount") {
      const next: WidgetDefaultConfiguration = {};
      if (baseAmount.trim()) next.baseAmount = baseAmount.trim();
      const discounts = parseDiscountPercentages(discountPercentages);
      if (discounts.length > 0) next.discountPercentages = discounts;
      return next;
    }
    if (calculatorId === "reference.synthetic-rule") {
      return baseAmount.trim() ? { baseAmount: baseAmount.trim() } : {};
    }
    if (calculatorId === "reference.business-margin") {
      const next: WidgetDefaultConfiguration = {};
      if (sellingPrice.trim()) next.sellingPrice = sellingPrice.trim();
      if (productCost.trim()) next.productCost = productCost.trim();
      if (variableSellingCostPerOrder.trim()) next.variableSellingCostPerOrder = variableSellingCostPerOrder.trim();
      return next;
    }
    if (calculatorId === "quick.percentage") {
      const next: WidgetDefaultConfiguration = {};
      if (baseValue.trim()) next.baseValue = baseValue.trim();
      if (percentage.trim()) next.percentage = percentage.trim();
      return next;
    }
    if (calculatorId === "quick.date-difference") {
      const next: WidgetDefaultConfiguration = {};
      if (startDate) next.startDate = startDate;
      if (endDate) next.endDate = endDate;
      return next;
    }
    if (calculatorId === "quick.length-conversion") {
      const next: WidgetDefaultConfiguration = { fromUnit, toUnit };
      if (value.trim()) next.value = value.trim();
      return next;
    }
    return {};
  }, [baseAmount, baseValue, calculatorId, discountPercentages, endDate, fromUnit, percentage, productCost, sellingPrice, startDate, toUnit, value, variableSellingCostPerOrder]);

  const addDomain = async () => {
    setBusy(true); setStatus("");
    try {
      const result = await createWidgetDomain(domainOrigin);
      const next = [...domains, result.domain];
      setDomains(next); setDomainId(result.domain.id); setVerification(result.verification); onDomainAdded(result.domain);
      setStatus(result.domain.verifiedAt !== null && result.domain.status === "active" ? "Verified" : "Needs verification");
    } catch { setStatus(locale === "id" ? "Domain belum dapat ditambahkan." : "Domain could not be added."); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!domainId) return;
    setBusy(true); setStatus("");
    try {
      const nextDomain = await verifyWidgetDomain(domainId);
      setDomains((current) => current.map((domain) => domain.id === nextDomain.id ? nextDomain : domain)); onDomainAdded(nextDomain); setStatus("Verified");
    } catch { setStatus(locale === "id" ? "Verifikasi belum berhasil." : "Verification has not succeeded yet."); }
    finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!domainId || selectedDomain?.verifiedAt === null || selectedDomain?.status !== "active") { setStatus("Needs verification"); return; }
    setBusy(true); setStatus("");
    try {
      const widget = await createWidget({
        name,
        calculatorId,
        locale: widgetLocale,
        domainIds: [domainId],
        defaults,
        theme: canCustomize ? { ...DEFAULT_THEME, appearance, accent } : DEFAULT_THEME,
        brandingPreference: canRemoveBranding && removeBranding ? "hidden" : "foundcalc",
      });
      setCreated(widget); onCreated(widget); setStatus("Embed code is ready.");
    } catch { setStatus(locale === "id" ? "Widget belum dapat dibuat." : "Widget could not be created."); }
    finally { setBusy(false); }
  };

  const safeDefaults = calculatorId === "reference.business-margin" ? (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Selling price default<input className={controlClass} value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} /></label>
      <label className="text-sm font-medium">Product cost default<input className={controlClass} value={productCost} onChange={(event) => setProductCost(event.target.value)} /></label>
      <label className="text-sm font-medium">Variable selling cost default<input className={controlClass} value={variableSellingCostPerOrder} onChange={(event) => setVariableSellingCostPerOrder(event.target.value)} /></label>
    </div>
  ) : calculatorId === "reference.discount" ? (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Starting price default<input className={controlClass} value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} /></label>
      <label className="text-sm font-medium">Sequential discounts default<input className={controlClass} value={discountPercentages} onChange={(event) => setDiscountPercentages(event.target.value)} placeholder="10, 5" /></label>
    </div>
  ) : calculatorId === "reference.synthetic-rule" ? (
    <label className="block text-sm font-medium">Base amount default<input className={controlClass} value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} /></label>
  ) : calculatorId === "quick.percentage" ? (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Base value default<input className={controlClass} value={baseValue} onChange={(event) => setBaseValue(event.target.value)} /></label>
      <label className="text-sm font-medium">Percentage default<input className={controlClass} value={percentage} onChange={(event) => setPercentage(event.target.value)} /></label>
    </div>
  ) : calculatorId === "quick.date-difference" ? (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Start date default<input type="date" className={controlClass} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label className="text-sm font-medium">End date default<input type="date" className={controlClass} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Length value default<input className={controlClass} value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <label className="text-sm font-medium">From unit<select className={controlClass} value={fromUnit} onChange={(event) => setFromUnit(event.target.value as LengthUnitOption)}>{LENGTH_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
      <label className="text-sm font-medium">To unit<select className={controlClass} value={toUnit} onChange={(event) => setToUnit(event.target.value as LengthUnitOption)}>{LENGTH_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
    </div>
  );

  return <section className="mt-8 border-t border-border pt-8" aria-labelledby="creation-title"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{locale === "id" ? "Alur pembuatan" : "Creation flow"}</p><h2 id="creation-title" className="mt-2 text-2xl font-bold">{locale === "id" ? "Buat kalkulator website" : "Create website calculator"}</h2></div><Button type="button" variant="secondary" onClick={onCancel}>{locale === "id" ? "Batal" : "Cancel"}</Button></div><ol className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">{APPROVED_STEPS.map((step, index) => <li key={step}><span className="font-semibold text-foreground">{index + 1}.</span> {step}</li>)}</ol><form onSubmit={submit} className="mt-8 space-y-8"><fieldset className="space-y-4"><legend className="font-bold">1–2 · {locale === "id" ? "Kalkulator dan bahasa" : "Calculator and locale"}</legend><label className="block text-sm font-medium">Widget name<input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Calculator<select className={controlClass} value={calculatorId} onChange={(event) => setCalculatorId(event.target.value as SupportedCalculatorId)}>{widgetCalculators.map((entry) => <option key={entry.id} value={entry.id}>{entry.copy[widgetLocale].title}</option>)}</select></label><label className="block text-sm font-medium">Widget language<select className={controlClass} value={widgetLocale} onChange={(event) => setWidgetLocale(event.target.value as "id" | "en")}><option value="en">English</option><option value="id">Bahasa Indonesia</option></select></label></div></fieldset><fieldset className="space-y-4"><legend className="font-bold">3–4 · {locale === "id" ? "Domain terverifikasi" : "Verified domain"}</legend><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="block text-sm font-medium">Domain origin<input className={controlClass} placeholder="https://example.com" value={domainOrigin} onChange={(event) => setDomainOrigin(event.target.value)} /></label><Button className="self-end" type="button" onClick={() => void addDomain()} disabled={busy || !domainOrigin.trim()}>Add domain</Button></div>{domains.length > 0 ? <label className="block text-sm font-medium">{locale === "id" ? "Domain widget" : "Widget domain"}<select className={controlClass} value={domainId} onChange={(event) => setDomainId(event.target.value)}><option value="">—</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.displayHostname} · {domain.verifiedAt !== null && domain.status === "active" ? "Verified" : "Needs verification"}</option>)}</select></label> : null}{verification?.method === "dns_txt" ? <div className="rounded-[var(--radius-control)] border border-border bg-muted/40 p-4 text-sm"><p><strong>DNS TXT:</strong> {verification.recordName}</p><code className="mt-2 block break-all">{verification.challengeToken}</code><Button className="mt-4" type="button" variant="secondary" onClick={() => void verify()} disabled={busy}>Verify domain</Button></div> : null}</fieldset><fieldset className="space-y-4"><legend className="font-bold">5 · Appearance</legend><p className="text-sm text-muted-foreground">{access.tier === "friends" ? "Friends keeps Powered by Found Calc visible." : `${access.tier === "besties" ? "Besties" : "Family"} controls are applied server-side.`}</p><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Appearance<select disabled={!canCustomize} className={`${controlClass} disabled:opacity-60`} value={appearance} onChange={(event) => setAppearance(event.target.value as typeof appearance)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="block text-sm font-medium">Accent<select disabled={!canCustomize} className={`${controlClass} disabled:opacity-60`} value={accent} onChange={(event) => setAccent(event.target.value as typeof accent)}><option value="brand">Brand</option><option value="blue">Blue</option><option value="teal">Teal</option></select></label></div>{canRemoveBranding ? <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={removeBranding} onChange={(event) => setRemoveBranding(event.target.checked)} /> Hide Found Calc attribution</label> : null}</fieldset><fieldset className="space-y-4"><legend className="font-bold">6 · Safe defaults</legend>{safeDefaults}</fieldset><section aria-labelledby="preview-step"><h3 id="preview-step" className="font-bold">7 · Preview</h3><div className="mt-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-5"><p className="font-semibold">{name || title}</p><p className="mt-1 text-sm text-muted-foreground">{title} · {selectedDomain?.displayHostname ?? (locale === "id" ? "Pilih domain" : "Choose a domain")}</p></div></section><section aria-labelledby="embed-step"><h3 id="embed-step" className="font-bold">8 · Copy embed code</h3>{snippet ? <pre data-testid="widget-embed-code" className="mt-3 max-w-full overflow-auto rounded-[var(--radius-control)] bg-foreground p-4 text-xs text-background"><code>{snippet}</code></pre> : <p className="mt-2 text-sm text-muted-foreground">{selectedDomain?.verifiedAt === null || selectedDomain?.status !== "active" ? "Needs verification" : locale === "id" ? "Buat widget untuk mendapatkan kode embed." : "Create the widget to get embed code."}</p>}</section><div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={busy || !name.trim() || !domainId}>Create widget</Button>{status ? <p role="status" className="text-sm font-semibold">{status}</p> : null}</div></form></section>;
}
