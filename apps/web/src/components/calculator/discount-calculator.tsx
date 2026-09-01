"use client";

import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import { discountCalculatorDefinition } from "@found-calc/engine";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runDiscount } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import { useCalculatorSurface } from "./calculator-surface";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { ValidationSummary } from "./validation-summary";
import { WorkspaceCalculationControls } from "./workspace-calculation-controls";

interface DiscountCalculatorProps { locale: Locale; entry: ReferenceCatalogEntry; recordId?: string | undefined; }
type DiscountDraft = Extract<LocalCalculatorDraft, { calculatorId: "reference.discount" }>;

const validationCopy = {
  id: { summary: "Periksa input berikut.", invalid: "Masukkan angka yang valid.", required: "Kolom ini wajib diisi.", range: "Nilai berada di luar rentang yang diizinkan.", result: "Hasil perhitungan" },
  en: { summary: "Check the following inputs.", invalid: "Enter a valid number.", required: "This field is required.", range: "The value is outside the allowed range.", result: "Calculation result" },
} as const;

const localize = (value: string, from: Locale, to: Locale, scale: number) => {
  if (from === to) return value;
  const parsed = parseLocaleDecimal(value, from, scale);
  return parsed.ok ? formatCanonicalDecimal(parsed.value, to) : value;
};
const formatWidgetDefault = (value: string | readonly string[] | undefined, locale: Locale) =>
  typeof value === "string" ? formatCanonicalDecimal(value, locale) : "";
const formatWidgetDefaultList = (value: string | readonly string[] | undefined, locale: Locale) =>
  Array.isArray(value)
    ? (value as readonly string[]).map((entry) => formatCanonicalDecimal(entry, locale))
    : [""];
const subscribeClientReady = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useClientReady() { return useSyncExternalStore(subscribeClientReady, getClientSnapshot, getServerSnapshot); }

export function DiscountCalculator({ locale, entry, recordId }: DiscountCalculatorProps) {
  const clientReady = useClientReady();
  if (!clientReady) return null;
  return <DiscountCalculatorStateful key={`${entry.id}:${locale}`} locale={locale} entry={entry} recordId={recordId} />;
}

function DiscountCalculatorStateful({ locale, entry, recordId }: DiscountCalculatorProps) {
  const surface = useCalculatorSurface();
  const started = useRef(false);
  const copy = entry.copy[locale];
  const text = validationCopy[locale];
  const [initialDraft] = useState<DiscountDraft | null>(() => {
    if (surface.surface !== "public") return null;
    const draft = readLocalDraft("reference.discount");
    return draft?.calculatorId === "reference.discount" ? draft : null;
  });
  const widgetDefaults = surface.surface === "widget" ? surface.initialDefaults : undefined;
  const [baseAmount, setBaseAmount] = useState(() =>
    initialDraft === null
      ? formatWidgetDefault(widgetDefaults?.baseAmount, locale)
      : localize(initialDraft.fields.baseAmount, initialDraft.locale, locale, 2),
  );
  const [discounts, setDiscounts] = useState<string[]>(() =>
    initialDraft === null
      ? formatWidgetDefaultList(widgetDefaults?.discountPercentages, locale)
      : initialDraft.fields.discounts.map((value) => localize(value, initialDraft.locale, locale, 4)),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<ReturnType<typeof runDiscount> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => {
    if (surface.surface !== "public") return;
    writeLocalDraft({ calculatorId: "reference.discount", locale, fields: { baseAmount, discounts } });
  }, [baseAmount, discounts, locale, surface.surface]);

  const signalStarted = () => {
    if (surface.surface !== "widget" || started.current) return;
    started.current = true;
    surface.onLifecycleEvent?.("calculator_started");
  };
  const dirty = () => { signalStarted(); setPersistableState(null); };
  const setDiscount = (index: number, value: string) => { dirty(); setDiscounts((current) => current.map((discount, currentIndex) => currentIndex === index ? value : discount)); };
  const removeDiscount = (index: number) => { dirty(); setDiscounts((current) => current.filter((_, currentIndex) => currentIndex !== index)); };

  const calculate = () => {
    const nextErrors: Record<string, string> = {};
    const parsedBase = parseLocaleDecimal(baseAmount, locale, 2);
    if (!parsedBase.ok) nextErrors.baseAmount = parsedBase.code === "empty" ? text.required : text.invalid;
    const normalizedDiscounts: string[] = [];
    discounts.forEach((discount, index) => {
      const parsed = parseLocaleDecimal(discount, locale, 4);
      if (!parsed.ok) { nextErrors[`discountPercentages.${index}`] = parsed.code === "empty" ? text.required : text.invalid; return; }
      normalizedDiscounts.push(parsed.value);
    });
    if (!parsedBase.ok || Object.keys(nextErrors).length > 0) { setFieldErrors(nextErrors); setOutcome(null); setPersistableState(null); return; }
    const nextOutcome = runDiscount({ baseAmount: parsedBase.value, discountPercentages: normalizedDiscounts });
    if (!nextOutcome.ok) {
      nextOutcome.issues.forEach((issue) => { const path = issue.path.replace(/\[(\d+)\]/g, ".$1"); nextErrors[path] = issue.code === "out-of-range" ? text.range : text.invalid; });
      setFieldErrors(nextErrors); setOutcome(null); setPersistableState(null); return;
    }
    setFieldErrors({}); setOutcome(nextOutcome);
    setPersistableState({ calculatorId: "reference.discount", calculatorVersion: discountCalculatorDefinition.version.version, input: { baseAmount: parsedBase.value, discountPercentages: normalizedDiscounts } });
    if (surface.surface === "widget") surface.onLifecycleEvent?.("calculation_completed");
  };

  const loadPersisted = (state: PersistedCalculatorState) => {
    if (state.calculatorId !== "reference.discount") return;
    setBaseAmount(formatCanonicalDecimal(state.input.baseAmount, locale));
    setDiscounts(state.input.discountPercentages.map((value) => formatCanonicalDecimal(value, locale)));
    setFieldErrors({}); setOutcome(null); setPersistableState(null);
  };

  const errorList = Object.values(fieldErrors);
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <p className="text-sm leading-6 text-muted-foreground">{copy.ui.sequentialHint}</p>
        <div className="mt-6 space-y-5">
          <CalculatorField id="discount-base-amount" label={copy.fields.baseAmount ?? ""} value={baseAmount} onChange={(event) => { dirty(); setBaseAmount(event.target.value); }} inputMode="decimal" autoComplete="off" error={fieldErrors.baseAmount} />
          <div className="space-y-4">{discounts.map((discount, index) => { const fieldKey = `discountPercentages.${index}`; const label = `${copy.fields.discountPercentages ?? ""} ${index + 1}`; return <div key={index} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><CalculatorField id={`discount-step-${index + 1}`} label={label} value={discount} onChange={(event) => setDiscount(index, event.target.value)} inputMode="decimal" autoComplete="off" error={fieldErrors[fieldKey]} />{discounts.length > 1 ? <Button type="button" variant="ghost" onClick={() => removeDiscount(index)} aria-label={`${copy.ui.removeDiscount ?? "Remove discount"}, ${index + 1}`}>{copy.ui.removeDiscount}</Button> : null}</div>; })}</div>
          <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => { dirty(); setDiscounts((current) => [...current, ""]); }}>{copy.ui.addDiscount}</Button><Button type="button" onClick={calculate}>{copy.ui.calculate}</Button></div>
          <ValidationSummary title={text.summary} errors={errorList} />
        </div>
        {surface.surface === "public" ? <PersistenceControls locale={locale} calculatorId="reference.discount" state={persistableState} onLoad={loadPersisted} /> : null}
        {surface.surface === "public" ? <WorkspaceCalculationControls locale={locale} calculatorId="reference.discount" state={persistableState} onLoad={loadPersisted} recordId={surface.recordId ?? recordId} /> : null}
      </section>
      <div className="min-w-0">{outcome?.ok ? <ResultPanel title={text.result}><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.1em] text-trust-foreground/75 uppercase">{copy.results[outcome.result.primaryAnswer.id] ?? outcome.result.primaryAnswer.id}</p><p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">{formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)}</p></div><dl className="mt-6 grid min-w-0 gap-4 border-t border-primary/15 pt-5 sm:grid-cols-2">{outcome.result.sections.flatMap((section) => section.values).map((value) => { const resultId = value.id.split(".")[0] ?? value.id; return <div key={value.id} className="min-w-0"><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results[resultId] ?? resultId}</dt><dd className="mt-1 break-words text-lg font-bold text-trust-foreground">{formatCanonicalDecimal(value.value, locale, { style: value.unit === "percent" ? "percent" : "decimal" })}</dd></div>; })}</dl></ResultPanel> : <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-6 text-sm leading-6 text-muted-foreground">{locale === "id" ? "Masukkan urutan diskon lalu hitung untuk melihat hasil." : "Enter the discount order, then calculate to see the result."}</div>}</div>
    </div>
  );
}
